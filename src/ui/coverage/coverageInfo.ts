// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import { ExecFileException, execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import * as vscode from 'vscode';

import Config from './config';
import GlobalConfig from '../../globalConfig';
import { fullToRelativePath, getRootDir } from '../../utils';

enum CoverageStatus {
	COVERED = 'COVERED',
	UNCOVERED = 'UNCOVERED',
}

// Coverage information for a given file.
type FileCoverageMap = Map<vscode.Range, CoverageStatus>;

// Map files to their coverage information.
type CoverageMap = Map<string, FileCoverageMap>;

// Result of running the coverage command.
interface CoverageCommandResult {
	statusCode: number;
	coverage?: CoverageMap;
	error?: string;
}

const warningMessage = `Source-based coverage is an unstable feature.`;

// Callback function for the coverage code lens action
export async function runCodeCoverageAction(
	renderer: CoverageRenderer,
	functionName: string,
): Promise<void> {
	const globalConfig = GlobalConfig.getInstance();
	const kaniBinaryPath = globalConfig.getFilePath();

	vscode.window.showWarningMessage(warningMessage);

	// Run this command: cargo kani --coverage -Z source-coverage --harness verify_success
	// to generate the source coverage output
	const coverageCommand: string = `${kaniBinaryPath} --coverage -Z source-coverage --harness ${functionName}`;
	const processOutput = await runCoverageCommand(coverageCommand, functionName);

	if (processOutput.statusCode === 0 && processOutput.coverage) {
		// Convert the array of (file, line, status) objects into Map<file <line, status>>
		// since we need to cache this globally
		globalConfig.setCoverage(processOutput.coverage);
		renderer.renderInterface(vscode.window.visibleTextEditors, processOutput.coverage);
	} else if (processOutput.error) {
		renderer.clearAllHighlights(); // Clear highlights if there's an error
		vscode.window.showErrorMessage(`Coverage generation failed: ${processOutput.error}`);
	}
}

/**
 * Run the --coverage command (with -Z line-coverage) to generate the coverage output, parse the output and return the result
 *
 * @param command - the kani command to run along with the harness name
 * @param harnessName - name of the harness
 * @returns - the result of executing the --coverage command and parsing the output
 */
async function runCoverageCommand(
	command: string,
	harnessName: string,
): Promise<CoverageCommandResult> {
	const directory = path.resolve(getRootDir());
	const args = command.split(' ').slice(1);
	const options = {
		shell: false,
		cwd: directory,
	};

	const globalConfig = GlobalConfig.getInstance();
	const kaniBinaryPath = globalConfig.getFilePath();

	vscode.window.showInformationMessage(`Generating coverage for ${harnessName}`);
	return new Promise<CoverageCommandResult>((resolve) => {
		execFile(
			kaniBinaryPath,
			args,
			options,
			(
				_error: ExecFileException | null,
				stdout: string | Buffer,
				stderr: string | Buffer,
			) => {
				void (async () => {
					// FIXME: there is likely a better way to check that coverage actually ran,
					// but relying on any printed message from coverage is brittle,
					// and we can't use the error code, since the error code corresponds to verification failure and not coverage status.
					if (stdout) {
						const parseResult = await parseKaniCoverageOutput(stdout.toString());
						resolve({ statusCode: 0, coverage: parseResult });
					} else {
						resolve({
							statusCode: 1,
							error: stderr.toString() || 'No output from coverage command',
						});
					}
				})().catch((err: unknown) => {
					resolve({
						statusCode: 1,
						error: err instanceof Error ? err.message : String(err),
					});
				});
			},
		);
	});
}

function getCoverageJsonPath(output: string): string | undefined {
	const regex = /\[info\] Coverage results saved to (.*)/u;
	const match = output.match(regex);

	if (match && match[1]) {
		return match[1].trim();
	}

	return undefined;
}

function readJsonFromPath(filePath: string): any {
	try {
		const jsonString = fs.readFileSync(filePath, 'utf-8');
		return JSON.parse(jsonString);
	} catch (error) {
		console.error('Error reading or parsing JSON file:', error);
		return undefined;
	}
}

/**
 * Search for the path to the report printed in Kani's output, and detect if we are in a remote
 * enviroment before returning the result.
 *
 * @param stdout - Kani's standard output after running the visualize command
 * @returns - undefined (error) or a result that indicates if the extension is executed on a local
 *  or remote environment. The result includes a `path` (if local) or a `command` (if remote).
 */
async function parseKaniCoverageOutput(stdout: string): Promise<CoverageMap> {
	const jsonFilePath = getCoverageJsonPath(stdout);
	const coverageMap: CoverageMap = new Map();

	if (jsonFilePath) {
		const files = fs.readdirSync(jsonFilePath);
		const jsonFiles = files.filter((file) => path.extname(file) === '.json');

		// In jsonFiles, store the string that contains the substring kaniraw.json and read that path
		if (jsonFiles.length > 0) {
			const kanirawJson = jsonFiles.find((file) => file.includes('kaniraw.json'));
			if (kanirawJson) {
				const filePath = path.join(jsonFilePath, kanirawJson);
				const jsonContent = readJsonFromPath(filePath);

				if (jsonContent && 'data' in jsonContent) {
					for (const file in jsonContent.data) {
						const regions = jsonContent.data[file];
						const regionMap: FileCoverageMap = new Map();

						for (const region of regions) {
							const startLine = region.region.start[0];
							const startCol = region.region.start[1];
							const endLine = region.region.end[0];
							const endCol = region.region.end[1];

							const status =
								region.status === 'COVERED' ? CoverageStatus.COVERED : CoverageStatus.UNCOVERED;
							const start = new vscode.Position(startLine - 1, startCol - 1);
							const end = new vscode.Position(endLine - 1, endCol - 1);
							const range = new vscode.Range(start, end);

							regionMap.set(range, status);
						}

						coverageMap.set(file, regionMap);
					}
				}
			}
		}
	}

	// If the global setting for showing output is on, show the output
	const config = vscode.workspace.getConfiguration('Kani');
	const showOutputWindow = config.get('showOutputWindow');

	const terminal = vscode.window.createOutputChannel('Coverage Report');
	terminal.appendLine(stdout);

	// Use the value to show or hide the output window
	if (showOutputWindow) {
		// Open channel but don't change focus
		terminal.show();
	}

	return coverageMap;
}

// Class representing the Renderer that handles rendering coverage highlights in the editor.
export class CoverageRenderer {
	private configStore: Config;
	constructor(configStore: Config) {
		this.configStore = configStore;
	}

	/**
	 * Clears all existing coverage highlights.
	 */
	public clearAllHighlights(): void {
		vscode.window.visibleTextEditors.forEach((editor) => {
			this.renderHighlight(editor, new Map());
		});
	}

	/**
	 * Renders coverage highlights for multiple files.
	 * @param editors - An array of text editor files to render coverage highlights for.
	 * @param coverageMap - A map containing coverage data for each file.
	 */
	public renderInterface(editors: readonly vscode.TextEditor[], coverageMap: CoverageMap): void {
		this.clearAllHighlights();
		editors.forEach((editor) => this.renderInterfaceForFile(editor, coverageMap));
	}

	/**
	 * Renders coverage highlights for a single text editor file.
	 * @param editor - The text editor to render coverage highlights for.
	 * @param coverageMap - A map containing coverage data for each file.
	 */
	public renderInterfaceForFile(editor: vscode.TextEditor, coverageMap: CoverageMap): void {
		const relativePath = fullToRelativePath(editor.document.fileName);
		const fileMap = coverageMap.get(relativePath);
		this.renderHighlight(editor, fileMap || new Map());
	}

	/**
	 * Applies the coverage highlights to the given text editor.
	 * @param editor - The text editor to apply the coverage highlights to.
	 * @param fileCoverageMap - A map containing coverage highlights for the file.
	 */
	public renderHighlight(editor: vscode.TextEditor, fileCoverageMap: FileCoverageMap): void {
		const coveredRanges: vscode.Range[] = [];
		const uncoveredRanges: vscode.Range[] = [];

		for (const [range, status] of fileCoverageMap) {
			(status === CoverageStatus.COVERED ? coveredRanges : uncoveredRanges).push(range);
		}

		editor.setDecorations(this.configStore.covered, coveredRanges);
		editor.setDecorations(this.configStore.uncovered, uncoveredRanges);
	}
}
