import * as vscode from 'vscode';
import { Uri } from 'vscode';
import {
	runKaniHarness,
	captureFailedChecks,
	runCargoKaniTest,
	runCargoKaniTestForFailedChecks,
} from '../model/kaniBinaryRunner';
import { KaniResponse } from '../constants';
import { parseRustfile, checkFileForProofs } from '../ui/sourceCodeParser';
import { getContentFromFilesystem } from '../utils';

export type KaniData = TestFile | TestCase | string;

// WeakMap as recommended by VSCode Guidelines to store additional info
export const testData = new WeakMap<vscode.TestItem, KaniData>();
// const colorFG = '\u001b[31m';
// const resetFG = '\u001b[39m';

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
export async function findInitialFiles(
	controller: vscode.TestController,
	pattern: vscode.GlobPattern,
	rootItem?: vscode.TestItem,
) {
	for (const file of await vscode.workspace.findFiles(pattern)) {
		const fileHasProofs = checkFileForProofs(await getContentFromFilesystem(file));
		if (fileHasProofs) {
			if (rootItem) {
				getOrCreateFile(controller, file, rootItem);
			} else {
				getOrCreateFile(controller, file);
			}
		} else {
			//TODO: Handle cases where rust files dont have proofs
			console.log(fileHasProofs, file);
		}
	}
}

// if a processed file contains kani proofs, return file, else, create a test file and return it
export function getOrCreateFile(
	controller: vscode.TestController,
	uri: Uri,
	rootItem?: vscode.TestItem,
) {
	const existing = controller.items.get(uri.toString());
	if (existing) {
		return { file: existing, data: testData.get(existing) as TestFile };
	}

	const file = controller.createTestItem(uri.toString(), uri.path.split('/').pop()!, uri);

	const data = new TestFile();
	testData.set(file, data);
	file.canResolveChildren = true;

	if (rootItem) {
		rootItem.children.add(file);
		controller.items.add(rootItem);
	}
	return { file, data };
}

/*
	A test file is a collection of harnesses that belong to the same rust file
 	This allows users to run proofs organized by files as well as individual test cases
*/
export class TestFile {
	public didResolve = false;

	public async updateFromDisk(
		controller: vscode.TestController,
		item: vscode.TestItem,
		treeRoot?: vscode.TestItem,
	) {
		try {
			const content = await getContentFromFilesystem(item.uri!);
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
	) {
		const ancestors = [{ item, children: [] as vscode.TestItem[] }];

		const ascend = (depth: number) => {
			while (ancestors.length > depth) {
				const finished = ancestors.pop()!;
				if (finished.children.length > 0) {
					finished.item.children.replace(finished.children);
				}
			}
		};

		// Trigger the parser and process extracted metadata to create a test case
		parseRustfile(content, {
			onTest: (range, name, harnessType, args) => {
				const parent = ancestors[ancestors.length - 1];
				if (!item.uri || !item.uri.fsPath) {
					throw new Error('No item or item path found');
				}
				const data = new TestCase(item.uri.fsPath, name, harnessType, args);
				const id = `${item.uri}/${data.getLabel()}`;

				const tcase = controller.createTestItem(id, data.getLabel(), item.uri);
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
	) {
		if (this.didResolve) {
			rootItem.children.add(currentFile);
			controller.items.add(rootItem);
		}
	}
}

/*
	Test Case contains metadata about the harness and can run the kani verification process
	on the given harness.
*/
export class TestCase {
	constructor(
		readonly file_name: string,
		readonly harness_name: string,
		readonly harness_type?: boolean,
		readonly harness_unwind_value?: number,
	) {}

	getLabel() {
		return `${this.harness_name}`;
	}

	// Run Kani on the harness, create links and pass/fail ui, present to the user
	async run(item: vscode.TestItem, options: vscode.TestRun): Promise<void> {
		const start = Date.now();
		if (this.harness_type) {
			const actual = await this.evaluate(
				this.file_name,
				this.harness_name,
				this.harness_unwind_value,
			);
			const duration = Date.now() - start;
			if (actual === 0) {
				options.passed(item, duration);
			} else {
				// const message = vscode.TestMessage.diff(`Expected ${item.label}`, String(this.expected), String(actual));
				// message.location = new vscode.Location(item.uri!, item.range!);

				//TODO: Add Property that failed as the info to be displayed
				//TODO: This is where the debugger will be plugged in, eventually
				const location = new vscode.Location(item.uri!, item.range!);
				const responseObject: KaniResponse = await captureFailedChecks(
					this.file_name,
					this.harness_name,
					this.harness_unwind_value,
				);
				const failedChecks = responseObject.failedProperty;
				const failedMessage = responseObject.failedMessages;
				const currentCase = new FailedCase(
					failedChecks,
					this.file_name,
					this.harness_name,
					failedMessage,
				);
				const messageWithLink = currentCase.handleFailure();
				// console.log(messageWithLink);
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
				const responseObject: KaniResponse = await runCargoKaniTestForFailedChecks(
					this.harness_name,
					this.harness_unwind_value,
				);
				const failedChecks = responseObject.failedProperty;
				const failedMessage = responseObject.failedMessages;
				const currentCase = new FailedCase(
					failedChecks,
					this.file_name,
					this.harness_name,
					failedMessage,
				);
				const messageWithLink = currentCase.handleFailure();
				// console.log(messageWithLink);
				options.appendOutput(failedMessage, location, item);
				options.failed(item, messageWithLink, duration);
			}
		}
	}

	// Run kani on the file, crate with given arguments
	async evaluate(rsFile: string, harness_name: string, args?: number) {
		if (vscode.workspace.workspaceFolders !== undefined) {
			//TODO: Change this to running harness
			if (args === undefined || NaN) {
				const outputKani: number = await runKaniHarness(rsFile!, harness_name);
				return outputKani;
			} else {
				const outputKani: number = await runKaniHarness(rsFile!, harness_name, args);
				return outputKani;
			}
		}
	}

	// Run kani on bolero test case, file, crate with given arguments
	async evaluateTest(harness_name: string, harness_args?: number) {
		if (vscode.workspace.workspaceFolders !== undefined) {
			if (harness_args === undefined || NaN) {
				const outputKaniTest = await runCargoKaniTest(harness_name);
				return outputKaniTest;
			} else {
				const outputKaniTest = await runCargoKaniTest(harness_name, harness_args);
				return outputKaniTest;
			}
		}
	}
}

/*
	A failed case contains additional information about the property that has failed
*/
class FailedCase extends TestCase {
	private readonly failed_checks: string;
	private readonly failed_message?: string;

	constructor(
		failed_checks: string,
		file_name: string,
		harness_name: string,
		failed_message?: string,
	) {
		super(file_name, harness_name);
		this.failed_checks = failed_checks;
		if (failed_message) {
			this.failed_message = failed_message;
		}
	}

	getLabel() {
		return `${this.harness_name}`;
	}

	handleFailure(): vscode.TestMessage {
		const finalFailureMessage = this.appendLink(this.failed_checks);
		const messageWithLink = new vscode.TestMessage(finalFailureMessage);
		return messageWithLink;
	}

	// Add link and present to the user as the diff message
	appendLink(failedChecks: string) {
		const sample = this.makeMarkdown(failedChecks);
		// vscode.commands.executeCommand('Kani.runViewerReport', this.harness_name);
		const args = [{ harnessName: this.harness_name, harnessFile: this.file_name }];
		const stageCommandUri = Uri.parse(
			`command:Kani.runViewerReport?${encodeURIComponent(JSON.stringify(args))}`,
		);
		// console.log(stageCommandUri);
		sample.appendMarkdown(`[View Report for ${this.harness_name}](${stageCommandUri})`);

		// console.log(sample.value);
		return sample;
	}

	// create the failure ui in markdown text with link
	makeMarkdown(failedChecks: string) {
		const placeholderMarkdown: vscode.MarkdownString = new vscode.MarkdownString('', true);
		placeholderMarkdown.supportHtml = true;
		placeholderMarkdown.isTrusted = true;

		const lines = failedChecks.split('\n');

		for (const line of lines) {
			placeholderMarkdown.appendMarkdown(line);
			placeholderMarkdown.appendMarkdown('<br />');
		}

		return placeholderMarkdown;
	}
}
