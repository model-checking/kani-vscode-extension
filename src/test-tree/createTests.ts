// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as vscode from 'vscode';
import { MarkdownString, TestMessage, Uri } from 'vscode';

import { KaniResponse } from '../constants';
import {
	captureFailedChecks,
	runCargoKaniTest,
	runKaniHarnessInterface,
} from '../model/kaniCommandCreate';
import { SourceCodeParser } from '../ui/sourceCodeParser';
import { getContentFromFilesystem } from '../utils';

export type KaniData = TestFile | TestCase | string;

// WeakMap as recommended by VSCode Guidelines to store additional info
export const testData = new WeakMap<vscode.TestItem, KaniData>();

interface TestFileMetaData {
	file: vscode.TestItem;
	data: TestFile;
}

/**
 * Get rust crates from all the workspaces open on vscode
 *
 * @returns List of workspace folders if they are rust crates
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function getWorkspaceTestPatterns() {
	if (!vscode.workspace.workspaceFolders) {
		return [];
	}

	return vscode.workspace.workspaceFolders.map((workspaceFolder) => ({
		workspaceFolder,
		pattern: new vscode.RelativePattern(workspaceFolder, '**/*.rs'),
	}));
}

// Find all the files in the crate that contain kani or bolero proofs
/**
 *
 * @param controller - Test Controller that contains all test cases and files
 * @param pattern - Glob pattern for rust files that helps find all relevant files
 * @param rootItem - Root node of the test tree
 */
export async function findInitialFiles(
	controller: vscode.TestController,
	pattern: vscode.GlobPattern,
	rootItem?: vscode.TestItem,
): Promise<void> {
	for (const file of await vscode.workspace.findFiles(pattern)) {
		const fileHasProofs: boolean = SourceCodeParser.checkFileForProofs(await getContentFromFilesystem(file));
		if (fileHasProofs) {
			if (rootItem) {
				getOrCreateFile(controller, file, rootItem);
			} else {
				getOrCreateFile(controller, file);
			}
		} else {
			console.log(fileHasProofs, file);
		}
	}
}

/**
 * If a processed file contains kani proofs, return file, else, create a test file and return it
 *
 * @param controller - Test Controller that contains all test cases and files
 * @param uri - get uri of the file (if processed already)
 * @param rootItem - root node of the test tree
 * @returns - Test File and it's metadata as a record
 */
export function getOrCreateFile(
	controller: vscode.TestController,
	uri: Uri,
	rootItem?: vscode.TestItem,
): TestFileMetaData {
	const existing = controller.items.get(uri.toString());
	if (existing) {
		return { file: existing, data: testData.get(existing) as TestFile };
	}

	const file: vscode.TestItem = controller.createTestItem(
		uri.toString(),
		uri.path.split('/').pop()!,
		uri,
	);

	const data: TestFile = new TestFile();
	testData.set(file, data);
	file.canResolveChildren = true;

	if (rootItem) {
		rootItem.children.add(file);
		controller.items.add(rootItem);
	}
	return { file, data };
}

/**
 * A test file is a collection of harnesses that belong to the same rust file
 * This allows users to run proofs organized by files as well as individual test cases
 *
 * class - TestFile
 */
export class TestFile {
	public didResolve = false;

	public async updateFromDisk(
		controller: vscode.TestController,
		item: vscode.TestItem,
		treeRoot?: vscode.TestItem,
	): Promise<void> {
		try {
			const content: string = await getContentFromFilesystem(item.uri!);
			item.error = undefined;
			this.updateFromContents(controller, content, item);
			if (treeRoot && this.didResolve) {
				this.addToCrate(controller, item, treeRoot);
			}
		} catch (e) {
			item.error = (e as Error).stack;
		}
	}

	/**
	 * Parses the tests from the input text, and updates the tests contained
	 * by this file to be those from the text,
	 */
	public updateFromContents(
		controller: vscode.TestController,
		content: string,
		item: vscode.TestItem,
	): void {
		const ancestors = [{ item, children: [] as vscode.TestItem[] }];

		// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
		const ascend = (depth: number) => {
			while (ancestors.length > depth) {
				const finished = ancestors.pop()!;
				if (finished.children.length > 0) {
					finished.item.children.replace(finished.children);
				}
			}
		};

		// Trigger the parser and process extracted metadata to create a test case
		SourceCodeParser.parseRustfile(content, {
			onTest: (range, name, proofBoolean, args) => {
				const parent = ancestors[ancestors.length - 1];
				if (!item.uri || !item.uri.fsPath) {
					throw new Error('No item or item path found');
				}
				const data: TestCase = new TestCase(item.uri.fsPath, name, proofBoolean, args);
				const id: string = `${item.uri}/${data.getLabel()}`;

				const tcase: vscode.TestItem = controller.createTestItem(id, data.getLabel(), item.uri);
				testData.set(tcase, data);
				tcase.range = range;
				parent.children.push(tcase);
			},
		});

		// Now that we have fully parsed the file, we can set the file as resolved
		this.didResolve = true;
		// finish and assign children for all remaining items
		ascend(0);
	}
	// convert controller items to test collection
	// convert the full resolved file, it's file and it's children as TestItem[]
	// console.log("inside add to crate for file", currentFile.id);
	public addToCrate(
		controller: vscode.TestController,
		currentFile: vscode.TestItem,
		rootItem: vscode.TestItem,
	): void {
		if (this.didResolve) {
			rootItem.children.add(currentFile);
			controller.items.add(rootItem);
		}
	}
}

/**
 * Test Case contains metadata about the harness and can run the kani verification process
 * on the given harness.
 *
 * @param file_name - name of the harness that is to be verified
 * @param harness_name - name of harness to be verified
 * @param proof_boolean - True if proof, false if bolero harness
 * @param harness_unwind_value - unwind value of the harness (if it exists)
 * @returns verification status (i.e success or failure)
 */
export class TestCase {
	constructor(
		readonly file_name: string,
		readonly harness_name: string,
		readonly proof_boolean: boolean,
		readonly harness_unwind_value?: number,
	) {}

	getLabel(): string {
		return `${this.harness_name}`;
	}

	// Run Kani on the harness, create links and pass/fail ui, present to the user
	async run(item: vscode.TestItem, options: vscode.TestRun): Promise<void> {
		const start: number = Date.now();
		if (this.proof_boolean) {
			const actual: number = await this.evaluate(
				this.file_name,
				this.harness_name,
				this.harness_unwind_value,
			);
			const duration: number = Date.now() - start;
			if (actual === 0) {
				options.passed(item, duration);
			} else {
				const location = new vscode.Location(item.uri!, item.range!);
				const responseObject: KaniResponse = await captureFailedChecks(
					this.file_name,
					this.harness_name,
					this.harness_unwind_value,
				);
				const failedChecks: string = responseObject.failedProperty;
				const failedMessage: string = responseObject.failedMessages;
				const currentCase = new FailedCase(
					failedChecks,
					this.file_name,
					this.harness_name,
					this.proof_boolean,
					failedMessage,
				);

				// Create failure case and return UI
				const messageWithLink: vscode.TestMessage = currentCase.handleFailure();
				options.appendOutput(failedMessage, location, item);
				options.failed(item, messageWithLink, duration);
			}
		} else {
			const actual = await this.evaluateTest(this.harness_name, this.harness_unwind_value);
			const duration = Date.now() - start;
			if (actual === 0) {
				options.passed(item, duration);
			} else {
				const location = new vscode.Location(item.uri!, item.range!);
				const responseObject: KaniResponse = await runCargoKaniTest(
					this.harness_name,
					true,
					this.harness_unwind_value,
				);
				const failedChecks: string = responseObject.failedProperty;
				const failedMessage: string = responseObject.failedMessages;
				const currentCase = new FailedCase(
					failedChecks,
					this.file_name,
					this.harness_name,
					this.proof_boolean,
					failedMessage,
				);
				const messageWithLink: vscode.TestMessage = currentCase.handleFailure();
				options.appendOutput(failedMessage, location, item);
				options.failed(item, messageWithLink, duration);
			}
		}
	}

	// Run kani on the file, crate with given arguments
	async evaluate(rsFile: string, harness_name: string, args?: number): Promise<number> {
		if (vscode.workspace.workspaceFolders !== undefined) {
			if (args === undefined || NaN) {
				const outputKani: number = await runKaniHarnessInterface(rsFile!, harness_name);
				return outputKani;
			} else {
				const outputKani: number = await runKaniHarnessInterface(rsFile!, harness_name, args);
				return outputKani;
			}
		}

		return 0;
	}

	// Run kani on bolero test case, file, crate with given arguments
	async evaluateTest(harness_name: string, harness_args?: number): Promise<number> {
		if (vscode.workspace.workspaceFolders !== undefined) {
			if (harness_args === undefined || NaN) {
				const outputKaniTest: number = await runCargoKaniTest(harness_name, false);
				return outputKaniTest;
			} else {
				const outputKaniTest: number = await runCargoKaniTest(harness_name, false, harness_args);
				return outputKaniTest;
			}
		}
		return 0;
	}
}

/**
 * A failed case contains additional information about the property that has failed
 */
class FailedCase extends TestCase {
	private readonly failed_checks: string;
	private readonly failed_message?: string;

	constructor(
		failed_checks: string,
		file_name: string,
		harness_name: string,
		harness_type: boolean,
		failed_message?: string,
	) {
		super(file_name, harness_name, harness_type);
		this.failed_checks = failed_checks;
		if (failed_message) {
			this.failed_message = failed_message;
		}
	}

	getLabel(): string {
		return `${this.harness_name}`;
	}

	handleFailure(): TestMessage {
		const finalFailureMessage: MarkdownString = this.appendLink(this.failed_checks);
		const messageWithLink = new TestMessage(finalFailureMessage);
		return messageWithLink;
	}

	// Add link and present to the user as the diff message
	appendLink(failedChecks: string): MarkdownString {
		const sample: MarkdownString = this.makeMarkdown(failedChecks);
		// vscode.commands.executeCommand('Kani.runViewerReport', this.harness_name);
		const args = [
			{
				harnessName: this.harness_name,
				harnessFile: this.file_name,
				harnessType: this.proof_boolean,
			},
		];
		const stageCommandUri = Uri.parse(
			`command:Kani.runViewerReport?${encodeURIComponent(JSON.stringify(args))}`,
		);
		sample.appendMarkdown(`[Generate report for ${this.harness_name}](${stageCommandUri})`);

		return sample;
	}

	// create the failure ui in markdown text with link
	makeMarkdown(failedChecks: string): MarkdownString {
		const placeholderMarkdown: vscode.MarkdownString = new vscode.MarkdownString('', true);
		placeholderMarkdown.supportHtml = true;
		placeholderMarkdown.isTrusted = true;

		if (failedChecks === undefined) {
			return placeholderMarkdown;
		}

		const lines = failedChecks.split('\n');

		for (const line of lines) {
			placeholderMarkdown.appendMarkdown(line);
			placeholderMarkdown.appendMarkdown('<br>');
		}

		return placeholderMarkdown;
	}
}
