// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as path from 'path';

import * as vscode from 'vscode';

import Config from './config';
import GlobalConfig from '../../globalConfig';
import { getKaniPath } from '../../model/kaniRunner';
import { CommandArgs, getRootDir, splitCommand } from '../../utils';

const { execFile } = require('child_process');

// Interface for parsing Kani's output and storing as an object
interface CoverageEntry {
	filePath: string;
	lineNumber: number;
	coverageStatus: string;
}

// Interface for storing the coverage status for each line of a document.
export interface CoverageLines {
    full: vscode.Range[];
    partial: vscode.Range[];
    none: vscode.Range[];
}

enum CoverageStatus {
	Full = "FULL",
	Partial = "PARTIAL",
	None = "NONE"
}

// Callback function for the coverage code lens action
export async function runCodeCoverageAction(renderer: CoverageRenderer, functionName: string): Promise<void> {
	const globalConfig = GlobalConfig.getInstance();
	const kaniBinaryPath = globalConfig.getFilePath();

	const activeEditor = vscode.window.activeTextEditor;
	const currentFileUri = activeEditor?.document.uri.fsPath;

	const playbackCommand: string = `${kaniBinaryPath} ${currentFileUri} --coverage -Z line-coverage --harness ${functionName}`;
	const processOutput = await runCoverageCommand(playbackCommand, functionName);

	if(processOutput.statusCode == 0) {
		const coverageOutputArray = processOutput.result;

		const formatted = parseCoverageFormatted(coverageOutputArray);
		globalConfig.setCoverage(formatted);

		// log global cached map
		console.log(formatted);

		renderer.renderInterface(vscode.window.visibleTextEditors, formatted);
	}
}

/**
 * Run the visualize command to generate the report, parse the output and return the result
 *
 * @param command - the cargo kani | kani command to run --visualize
 * @returns - the result of executing the visualize command and parsing the output
 */
async function runCoverageCommand(command: string, harnessName: string): Promise<any> {
	// Get the full resolved path for the root directory of the crate
	const directory = path.resolve(getRootDir());
	const commmandSplit = command.split(' ');

	// Get args for the command to be executed
	const args = commmandSplit.slice(1);

	const options = {
		shell: false,
		cwd: directory,
	};

	const globalConfig = GlobalConfig.getInstance();
	const kaniBinaryPath = await getKaniPath('kani');

	vscode.window.showInformationMessage(
		`Kani located at ${kaniBinaryPath} being used for verification`,
	);

	vscode.window.showInformationMessage(`Generating coverage for ${harnessName}`);
	return new Promise((resolve, _reject) => {
		execFile(kaniBinaryPath, args, options, async (_error: any, stdout: any, _stderr: any) => {
			if (stdout) {
				const parseResult = await parseKaniCoverageOutput(stdout);
				resolve({ statusCode: 0, result: parseResult });
			}
		});
	});
}

/**
 * Search for the path to the report printed in Kani's output, and detect if we are in a remote
 * enviroment before returning the result.
 *
 * @param stdout - Kani's standard output after running the visualize command
 * @returns - undefined (error) or a result that indicates if the extension is executed on a local
 *  or remote environment. The result includes a `path` (if local) or a `command` (if remote).
 */
async function parseKaniCoverageOutput(stdout: string): Promise<any | undefined> {
	const kaniOutput: string = stdout;
	const kaniOutputArray: string[] = kaniOutput.split('Coverage Results:\n');

	const coverageResults = kaniOutputArray.at(1);

	if(coverageResults === undefined) {
		return '';
	}

	const coverageResultsArray = coverageResults.split('\n')!;

	const terminal = vscode.window.createOutputChannel('Coverage Report');
	terminal.appendLine(coverageResults);
	terminal.show();

	const coverage = parseCoverageData(coverageResultsArray);

	// No command found from Kani
	return coverage;
}

// Parse the new format and convert it into a coverageMap
function parseCoverageFormatted(entries: CoverageEntry[]): Map<string, Map<number, string>> {
	const nestedMap: Map<string, Map<number, string>> = new Map();

	for (const entry of entries) {
		const { filePath, lineNumber, coverageStatus } = entry;

		// Check if the outer map already has an entry for the filePath
		let innerMap = nestedMap.get(filePath);

		// If not, create a new inner map and set it in the outer map
		if (!innerMap) {
			innerMap = new Map<number, CoverageStatus>();
			nestedMap.set(filePath, innerMap);
		}

		// Set the coverageStatus in the inner map for the lineNumber
		innerMap.set(lineNumber, coverageStatus);
	}

	return nestedMap;
}

// Convert
function parseCoverageData(data: string[]): CoverageEntry[] {
	const coverageEntries: CoverageEntry[] = [];

	for (const entry of data) {
	  const parts = entry.split(', ');

	  if (parts.length === 3) {
		const [filePath, lineNumberStr, coverageStatus] = parts;
		if(filePath.includes('Complete - ')) {
			return coverageEntries;
		}
		const lineNumber = parseInt(lineNumberStr.trim(), 10);

		coverageEntries.push({
		  filePath,
		  lineNumber,
		  coverageStatus,
		});
	  }
	}

	return coverageEntries;
}

// Class representing the Renderer that handles rendering coverage highlights in the editor.
export class CoverageRenderer {
	private configStore: Config;
	constructor(
        configStore: Config,
    ) {
        this.configStore = configStore;
    }

	/**
	 * Renders coverage highlights for multiple files.
	 * @param editors - An array of text editor files to render coverage highlights for.
	 * @param coverageMap - A map containing coverage data for each file.
	 */
	public renderInterface(editors: readonly vscode.TextEditor[], coverageMap: Map<string, Map<number, string>>): void {
		editors.forEach((editor) => {
			// If coverageMap is empty, de-highlight the files
			if(coverageMap.size == 0) {
				const coverageLines: CoverageLines = {
					full: [],
					none: [],
					partial: [],
				};

				this.renderHighlight(editor, coverageLines);
				return;
			}

			// Fetch the coverage data for a file from the coverageMap.
			const fileMap = coverageMap.get(editor.document.fileName)!;
			const coverageLines = this.createCoverage(editor.document, fileMap);
			this.renderHighlight(editor, coverageLines);
			return;
		});
	}

	/**
	 * Renders coverage highlights for a single text editor file.
	 * @param editor - The text editor to render coverage highlights for.
	 * @param coverageMap - A map containing coverage data for each file.
	 */
	public renderInterfaceForFile(editor: vscode.TextEditor, coverageMap: Map<string, Map<number, string>>): void {
		if(coverageMap.size == 0) {
			const coverageLines: CoverageLines = {
				full: [],
				none: [],
				partial: [],
			};

			this.renderHighlight(editor, coverageLines);
		}
		const fileMap = coverageMap.get(editor.document.fileName);
		if(fileMap === undefined){
			return;
		}
		const coverageLines = this.createCoverage(editor.document, fileMap);
		this.renderHighlight(editor, coverageLines);
	}


	/**
	 * Creates coverage highlights for a given text document based on the coverageFileMap.
	 * @param doc - The text document for which coverage highlights are to be created.
	 * @param coverageFileMap - A map containing coverage status for each line number.
	 * @returns An object containing coverage highlights categorized as 'full', 'partial', and 'none'.
	 */
	public createCoverage(doc: vscode.TextDocument, coverageFileMap: Map<number, string>): CoverageLines {
		const coverageLines: CoverageLines = {
            full: [],
            none: [],
            partial: [],
        };

		for (let lineNum = 1; lineNum <= doc.lineCount; lineNum++) {
			const line = doc.lineAt(lineNum - 1);
			const status = coverageFileMap.get(lineNum);

			if(status === undefined) {
				continue;
			}

			const range = new vscode.Range(line.range.start, line.range.end);
			switch (status) {
				case "FULL":
					coverageLines.full.push(range);
					break;
				case "PARTIAL":
					coverageLines.partial.push(range);
					break;
				case "NONE":
					coverageLines.none.push(range);
					break;
				default:
					break;
			}
		}

		return coverageLines;
	}

	/**
	 * Applies the coverage highlights to the given text editor.
	 * @param editor - The text editor to apply the coverage highlights to.
	 * @param coverageLinesInfo - An object containing coverage highlights categorized as 'full', 'partial', and 'none'.
	 */
	public renderHighlight(editor: vscode.TextEditor, coverageLinesInfo: CoverageLines): void {
		editor.setDecorations(this.configStore.covered, coverageLinesInfo.full);
		editor.setDecorations(this.configStore.partialcovered, coverageLinesInfo.partial);
		editor.setDecorations(this.configStore.uncovered, coverageLinesInfo.none);
	}
}
