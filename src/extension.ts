// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as vscode from 'vscode';
import { Uri } from 'vscode';

import { gatherTestItems } from './test-tree/buildTree';
import {
	KaniData,
	TestCase,
	TestFile,
	findInitialFiles,
	getOrCreateFile,
	getWorkspaceTestPatterns,
	testData,
} from './test-tree/createTests';
import { callConcretePlayback } from './ui/concrete-playback/concretePlayback';
import { callViewerReport } from './ui/reportView/callReport';
import { showInformationMessage } from './ui/showMessage';
import { SourceCodeParser } from './ui/sourceCodeParser';
import { startWatchingWorkspace } from './ui/watchWorkspace';
import { checkCargoExist, getContentFromFilesystem, getRootDirURI } from './utils';

// Entry point of the extension
export async function activate(context: vscode.ExtensionContext): Promise<void> {
	if (!checkCargoExist()) {
		vscode.window.showErrorMessage('Cannot find Cargo.toml to run Cargo Kani on crate');
	}

	const controller: vscode.TestController = vscode.tests.createTestController(
		'Kani Proofs',
		'Kani Proofs',
	);

	// create a uri for the root folder
	context.subscriptions.push(controller);
	const crateURI: Uri = getRootDirURI();
	const treeRoot: vscode.TestItem = controller.createTestItem(
		'Kani proofs',
		'Kani Proofs',
		crateURI,
	);

	/**
	 * Run Handler is the controlled callback function that runs whenever a test case is clicked
	 *
	 * @param request - Run Request from VSCode, an event token that is passed upon when a test case is clicked
	 * @param cancellation - Cancellation even token that is passed when the stop button is clicked
	 */
	const runHandler = (
		request: vscode.TestRunRequest,
		cancellation: vscode.CancellationToken,
	): void => {
		const queue: { test: vscode.TestItem; data: TestCase }[] = [];
		const run: vscode.TestRun = controller.createTestRun(request);
		// map of file uris to statements on each line:
		const coveredLines = new Map<string, (vscode.StatementCoverage | undefined)[]>();

		const discoverTests = async (tests: Iterable<vscode.TestItem>): Promise<void> => {
			for (const test of tests) {
				// check if each test is in exclude list
				if (request.exclude?.includes(test)) {
					continue;
				}
				// data is test data
				const data: KaniData | undefined = testData.get(test);
				// console.log("Data for each test is", data);
				// check if this is an object of class testcase (that we wrote)
				if (data instanceof TestCase) {
					run.enqueued(test);
					// This queue takes a tuple of test and it's data
					queue.push({ test, data });
				} else {
					// If it's been parsed by the parser, then it's either a testcase or a test heading
					// if it's not already been processed, then get the children under the heading
					// updatefromdisk gets the children and puts them under the test root
					if (data instanceof TestFile && !data.didResolve) {
						await data.updateFromDisk(controller, test);
					}
					// update the test tree with the new heading items
					await discoverTests(gatherTestItems(test.children));
				}

				// test uri is it's unique identifier and we store the uris in a map called coveredlines
				// to prevent re-processing the lines
				if (test.uri && !coveredLines.has(test.uri.toString())) {
					try {
						const lines: string[] = (await getContentFromFilesystem(test.uri)).split('\n');
						coveredLines.set(
							test.uri.toString(),
							lines.map((lineText, lineNo) =>
								lineText.trim().length
									? new vscode.StatementCoverage(0, new vscode.Position(lineNo, 0))
									: undefined,
							),
						);
					} catch {
						// ignored
					}
				}
			}
		};

		const runTestQueue = async (): Promise<void> => {
			for (const { test, data } of queue) {
				run.appendOutput(`Running ${test.id}\r\n`);
				if (cancellation.isCancellationRequested) {
					run.skipped(test);
				} else {
					run.started(test);
					await data.run(test, run);
				}

				const lineNo: number = test.range!.start.line;
				const fileCoverage = coveredLines.get(test.uri!.toString());
				if (fileCoverage) {
					fileCoverage[lineNo]!.executionCount++;
				}

				run.appendOutput(`Completed ${test.id}\r\n`);
			}

			run.end();
		};

		/**
		 *  Map from line uri to coverage info
		 */
		run.coverageProvider = {
			provideFileCoverage(): vscode.FileCoverage[] {
				const coverage: vscode.FileCoverage[] = [];
				for (const [uri, statements] of coveredLines) {
					coverage.push(
						vscode.FileCoverage.fromDetails(
							Uri.parse(uri),
							statements.filter((s): s is vscode.StatementCoverage => !!s),
						),
					);
				}

				return coverage;
			},
		};

		// Initial test case scan across the crate
		discoverTests(request.include ?? gatherTestItems(controller.items)).then(runTestQueue);
	};

	/**
	 * Refresh Handler is run whenever the refresh button is clicked
	 * Actions -
	 * 1. Get all relevant files
	 * 2. Check if they contain proofs
	 * 3. Update test tree with test cases from relevant files
	 */
	controller.refreshHandler = async (): Promise<void> => {
		await Promise.all(
			getWorkspaceTestPatterns().map(({ pattern }) => findInitialFiles(controller, pattern)),
		);
		for (const document of vscode.workspace.textDocuments) {
			updateNodeForDocument(document);
		}
	};

	// Add run handler to run profile as a test run (vs debug run)
	controller.createRunProfile('Kani Proofs', vscode.TestRunProfileKind.Run, runHandler, true);

	// Add crate watcher to vscode subscriptions
	context.subscriptions.push(...startWatchingWorkspace(controller, treeRoot));

	controller.resolveHandler = async (item): Promise<void> => {
		if (!item) {
			context.subscriptions.push(...startWatchingWorkspace(controller));
			return;
		}
		const data: KaniData | undefined = testData.get(item);
		if (data instanceof TestFile) {
			await data.updateFromDisk(controller, item);
			data.addToCrate(controller, item, treeRoot);
		}
	};

	// Run Kani
	const runKani = vscode.commands.registerCommand('Kani.runKani', async () => {
		showInformationMessage('Kani.runKani');
	});

	// Run Cargo Kani
	const runcargoKani = vscode.commands.registerCommand('Kani.runcargoKani', async () => {
		showInformationMessage('Kani.runcargoKani');
	});

	// Register the run viewer report command
	const runningViewerReport = vscode.commands.registerCommand(
		'Kani.runViewerReport',
		async (harnessArgs) => {
			callViewerReport('Kani.runViewerReport', harnessArgs);
		},
	);

	// Register the run viewer report command
	const runningConcretePlayback = vscode.commands.registerCommand(
		'Kani.runConcretePlayback',
		async (harnessArgs) => {
			callConcretePlayback('Kani.runConcretePlayback', harnessArgs);
		},
	);

	// Callback function to Find or create files, update test tree and present to user upon trigger
	async function updateNodeForDocument(e: vscode.TextDocument): Promise<void> {
		if (e.uri.scheme !== 'file') {
			return;
		}

		if (!e.uri.path.endsWith('.rs')) {
			return;
		}

		if (!SourceCodeParser.checkFileForProofs(await getContentFromFilesystem(e.uri))) {
			return;
		}

		const { file, data } = getOrCreateFile(controller, e.uri);
		data.updateFromContents(controller, e.getText(), file);
		data.addToCrate(controller, file, treeRoot);
	}

	// Update the test tree with proofs whenever a test case is opened
	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(updateNodeForDocument),
		// vscode.workspace.onDidChangeTextDocument(e => updateNodeForDocument(e.document)),
	);

	context.subscriptions.push(runKani);
	context.subscriptions.push(runcargoKani);
	context.subscriptions.push(runningViewerReport);
	context.subscriptions.push(runningConcretePlayback);
}
