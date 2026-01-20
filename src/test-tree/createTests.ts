// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as path from 'path';

import * as vscode from 'vscode';
import { MarkdownString, TestMessage, Uri } from 'vscode';

import { KaniResponse } from '../constants';
import { captureFailedChecks, runKaniHarnessInterface } from '../model/kaniCommandCreate';
import { SourceCodeParser } from '../ui/sourceCodeParser';
import { FileMetaData } from '../ui/sourceMap';
import {
	extractFileName,
	getContentFromFilesystem,
	getPackageName,
	getPackageNameFromFilePath,
	showErrorWithReportIssueButton,
} from '../utils';

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
		const fileHasProofs: boolean = await SourceCodeParser.checkFileForProofs(
			await getContentFromFilesystem(file),
		);
		if (fileHasProofs) {
			if (rootItem) {
				await getOrCreateFile(controller, file, rootItem);
			} else {
				await getOrCreateFile(controller, file);
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
export async function getOrCreateFile(
	controller: vscode.TestController,
	uri: Uri,
	rootItem?: vscode.TestItem,
): Promise<TestFileMetaData> {
	const existing = controller.items.get(uri.toString());
	if (existing) {
		return { file: existing, data: testData.get(existing) as TestFile };
	}

	let testLabel = '';

	// Label from the file URI
	const packageName = await getPackageNameFromFilePath(uri);
	if (packageName !== undefined) {
		testLabel = `${packageName}/${uri.fsPath.split('/').pop()!}`;
	} else {
		testLabel = uri.fsPath.split('/').pop()!;
	}

	const file: vscode.TestItem = controller.createTestItem(uri.toString(), testLabel, uri);

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
			// eslint-disable-next-line require-atomic-updates
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
	public async updateFromContents(
		controller: vscode.TestController,
		content: string,
		item: vscode.TestItem,
	): Promise<void> {
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

		const metadata = await getCurrentRustFileMetadata(item);
		if (metadata === undefined) {
			showErrorWithReportIssueButton(
				`Could not find workspace for ${item.uri}. Please add ${item.uri} to your VSCode workspace.`,
			);
			return;
		}

		// Trigger the parser and process extracted metadata to create a test case
		await SourceCodeParser.parseRustfile(content, {
			onTest: (range, harnessName, proofBoolean, stubAttribute, moduleName) => {
				const parent = ancestors[ancestors.length - 1];
				if (!item.uri || !item.uri.fsPath) {
					throw new Error('No item or item path found');
				}
				// get file name as well (we already do, so it's fine)

				// pass in the module name as well if present
				const packageName = typeof metadata?.fileName === 'undefined' ? '' : metadata?.filePackage;
				const data: TestCase = new TestCase(
					item.uri.fsPath,
					harnessName,
					packageName,
					proofBoolean,
					stubAttribute,
					moduleName,
				);
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
 * @param package_name - Name of the package the harness is under that is extracted from cargo.toml
 * @param proof_boolean - True if proof, false if bolero harness
 * @param stubbing - True if the Kani harness is annotated with stubs
 * @param module_name - Name of the module containing the harness if present
 * @returns verification status (i.e success or failure)
 */
export class TestCase {
	constructor(
		readonly file_name: string,
		readonly harness_name: string,
		readonly package_name: string,
		readonly proof_boolean: boolean,
		readonly stubbing_request?: boolean,
		readonly module_name?: string,
	) {}

	getLabel(): string {
		return `${this.harness_name}`;
	}

	// Expand the harness name to include the name of the file and module name as an attempt to narrow down the number of matches for this harness.
	// This is a heuristic, and it may generate an identifier that does not match any symbol.
	expandFunctionName(): string {
		if (this.module_name === '') {
			const fileName = extractFileName(this.file_name);
			if (fileName === 'main' || fileName === 'lib' || fileName === 'mod') {
				return `${this.harness_name}`;
			}
			return `${fileName}::${this.harness_name}`;
		} else if (this.module_name !== '') {
			if (this.file_name !== '') {
				const fileName = extractFileName(this.file_name);
				if (fileName === 'main' || fileName === 'lib' || fileName === 'mod') {
					return `${this.module_name}::${this.harness_name}`;
				}
				return `${fileName}::${this.module_name}::${this.harness_name}`;
			}
		}

		return this.harness_name;
	}

	// Run Kani on the harness, create links and pass/fail ui, present to the user
	async run(item: vscode.TestItem, options: vscode.TestRun): Promise<void> {
		const start: number = Date.now();
		const qualified_name = this.expandFunctionName();

		if (this.proof_boolean) {
			const actual: number = await this.evaluate(
				this.harness_name,
				this.package_name,
				this.stubbing_request,
				qualified_name,
			);
			const duration: number = Date.now() - start;
			if (actual === 0) {
				options.passed(item, duration);
			} else if (actual == 1) {
				const location = new vscode.Location(item.uri!, item.range!);
				const responseObject: KaniResponse = await captureFailedChecks(
					qualified_name,
					this.package_name,
					false,
					this.stubbing_request,
				);
				const failedChecks: string = responseObject.failedProperty;
				const failedMessage: string = responseObject.failedMessages;
				const currentCase = new FailedCase(
					failedChecks,
					this.file_name,
					qualified_name,
					this.package_name,
					this.proof_boolean,
					failedMessage,
				);

				// Create failure case and return UI
				const messageWithLink: vscode.TestMessage = currentCase.handleFailure();
				options.appendOutput(failedMessage, location, item);
				options.failed(item, messageWithLink, duration);
			} else {
				options.errored(
					item,
					new TestMessage(
						'Kani executable was unable to detect or run harness. Please check Output (Kani) channel in the Output window for more information.',
					),
				);
			}
		} else {
			const actual = await this.evaluateTest(
				this.harness_name,
				this.package_name,
				this.stubbing_request,
				qualified_name,
			);
			const duration = Date.now() - start;
			if (actual === 0) {
				options.passed(item, duration);
			} else if (actual == 1) {
				const location = new vscode.Location(item.uri!, item.range!);
				const responseObject: KaniResponse = await captureFailedChecks(
					qualified_name,
					this.package_name,
					true,
					this.stubbing_request,
				);
				const failedChecks: string = responseObject.failedProperty;
				const failedMessage: string = responseObject.failedMessages;
				const currentCase = new FailedCase(
					failedChecks,
					this.file_name,
					qualified_name,
					this.package_name,
					this.proof_boolean,
					failedMessage,
				);
				const messageWithLink: vscode.TestMessage = currentCase.handleFailure();
				options.appendOutput(failedMessage, location, item);
				options.failed(item, messageWithLink, duration);
			} else {
				options.errored(
					item,
					new TestMessage(
						'Kani executable was unable to detect or run harness. Please check Output (Kani) channel in the Output window for more information.',
					),
				);
			}
		}
	}

	// Run kani on the file, crate with given arguments
	async evaluate(
		harness_name: string,
		package_name: string,
		stubbing?: boolean,
		qualified_name?: string,
	): Promise<number> {
		if (vscode.workspace.workspaceFolders !== undefined) {
			if (stubbing === false || undefined || NaN) {
				const outputKani: number = await runKaniHarnessInterface(
					harness_name,
					package_name,
					false,
					undefined,
					qualified_name,
				);
				return outputKani;
			} else {
				const outputKani: number = await runKaniHarnessInterface(
					harness_name,
					package_name,
					false,
					stubbing,
					qualified_name,
				);
				return outputKani;
			}
		}

		return 0;
	}

	// Run kani on Bolero test case, file, crate with given arguments
	async evaluateTest(
		harness_name: string,
		package_name: string,
		stubbing?: boolean,
		qualified_name?: string,
	): Promise<number> {
		if (vscode.workspace.workspaceFolders !== undefined) {
			if (stubbing === false || undefined || NaN) {
				const outputKaniTest: number = await runKaniHarnessInterface(
					harness_name,
					package_name,
					true,
					false,
					qualified_name,
				);
				return outputKaniTest;
			} else {
				const outputKaniTest: number = await runKaniHarnessInterface(
					harness_name,
					package_name,
					true,
					stubbing,
					qualified_name,
				);
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
		package_name: string,
		harness_type: boolean,
		failed_message?: string,
	) {
		super(file_name, harness_name, package_name, harness_type);
		this.failed_checks = failed_checks;
		if (failed_message) {
			this.failed_message = failed_message;
		}
	}

	getLabel(): string {
		return `${this.harness_name}`;
	}

	handleFailure(): TestMessage {
		const finalFailureMessage: MarkdownString = this.appendConcretePlaybackLink(this.failed_checks);
		const messageWithLink = new TestMessage(finalFailureMessage);
		return messageWithLink;
	}

	// Add link and present to the user as the diff message
	appendConcretePlaybackLink(failedChecks: string): MarkdownString {
		const sample: MarkdownString = this.makeMarkdown(failedChecks);
		const args = [
			{
				harnessName: this.harness_name,
				harnessFile: this.file_name,
				harnessType: this.proof_boolean,
			},
		];
		const concretePlaybackUri: Uri = Uri.parse(
			`command:Kani.runConcretePlayback?${encodeURIComponent(JSON.stringify(args))}`,
		);
		sample.appendMarkdown(
			`[Generate concrete test for ${this.harness_name}](${concretePlaybackUri})`,
		);

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

		const lines: string[] = failedChecks.split('\n');

		for (const line of lines) {
			placeholderMarkdown.appendMarkdown(line);
			placeholderMarkdown.appendMarkdown('<br>');
		}

		return placeholderMarkdown;
	}
}

async function getCurrentRustFileMetadata(item: any): Promise<FileMetaData | undefined> {
	const workspaceFolders = vscode.workspace.workspaceFolders;

	if (!workspaceFolders || workspaceFolders.length === 0) {
		return undefined;
	}

	const workspace = workspaceFolders[0];

	if (!workspace) {
		return undefined;
	}

	const fileName = path.basename(item.uri.fsPath);
	const filePath = item.uri.fsPath;

	const workspacePath = workspace.uri.fsPath;
	const crateName = path.basename(workspacePath);
	const cratePath = workspacePath;

	const fs = require('fs');
	let tomlsInFolder = '';
	let tomlFilePath: string = filePath;

	do {
		tomlFilePath = path.dirname(tomlFilePath);
		tomlsInFolder = fs
			.readdirSync(tomlFilePath)
			.filter((file: string) => path.extname(file) === '.toml');
	} while (!tomlsInFolder.includes('Cargo.toml') && tomlFilePath.length > 0);

	const filePackage = await getPackageName(tomlFilePath);

	const file_metadata: FileMetaData = {
		fileName: fileName,
		filePath: filePath,
		filePackage: filePackage,
		crateName: crateName,
		cratePath: cratePath,
	};

	return file_metadata;
}
