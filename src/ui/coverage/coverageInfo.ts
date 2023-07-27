// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as fs from 'fs';
import * as path from 'path';

import * as vscode from 'vscode';

import GlobalConfig from '../../globalConfig';
import { getKaniPath } from '../../model/kaniRunner';
import { CommandArgs, getRootDir, splitCommand } from '../../utils';
import Config from './config';

const { execFile } = require('child_process');
const { promisify } = require('util');
const warningMessage = `Report generation is an unstable feature.
Coverage information has been disabled due recent issues involving incorrect results.`;

export async function runCodeCoverageAction(renderer: Renderer, functionName: string): Promise<void> {
	const globalConfig = GlobalConfig.getInstance();
	const kaniBinaryPath = '/home/ubuntu/kani/scripts/kani';

	const activeEditor = vscode.window.activeTextEditor;
	const currentFileUri = activeEditor?.document.uri.fsPath;

	const playbackCommand: string = `${kaniBinaryPath} ${currentFileUri} --enable-unstable --coverage --harness ${functionName}`;
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
	const kaniBinaryPath = '/home/ubuntu/kani/scripts/kani'

	vscode.window.showInformationMessage(
		`Kani located at ${kaniBinaryPath} being used for verification`,
	);

	vscode.window.showInformationMessage(`Generating coverage for ${harnessName}`);
	return new Promise((resolve, _reject) => {
		execFile(kaniBinaryPath, args, options, async (_error: any, stdout: any, _stderr: any) => {
			if (stdout) {
				console.log(stdout);
				const parseResult = await parseReportOutput(stdout);
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
async function parseReportOutput(stdout: string): Promise<any | undefined> {
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

interface CoverageEntry {
	filePath: string;
	lineNumber: number;
	coverageStatus: string;
}

export interface CoverageInfo {
    full: vscode.Range[];
    partial: vscode.Range[];
    none: vscode.Range[];
}

enum CoverageStatus {
	Full = "FULL",
	Partial = "PARTIAL",
	None = "NONE"
}

// Function to parse the new format and convert it into a coverageMap
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

export interface ICoverageLines {
    full: vscode.Range[];
    partial: vscode.Range[];
    none: vscode.Range[];
}

export class Renderer {
	private configStore: Config;
	constructor(
        configStore: Config,
    ) {
        this.configStore = configStore;
    }

	public renderInterface(editors: readonly vscode.TextEditor[], coverageMap: Map<string, Map<number, string>>) {
		editors.forEach((editor) => {
			if(coverageMap.size == 0) {
				const coverageLines: ICoverageLines = {
					full: [],
					none: [],
					partial: [],
				};

				this.renderHighlight(editor, coverageLines);
				return;
			}
			const fileMap = coverageMap.get(editor.document.fileName)!;
			const coverageLines = this.createCoverage(editor.document, fileMap);
			this.renderHighlight(editor, coverageLines);
			return;
		});
	}

	public renderInterfaceForFile(editor: vscode.TextEditor, coverageMap: Map<string, Map<number, string>>) {
		if(coverageMap.size == 0) {
			const coverageLines: ICoverageLines = {
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

	public createCoverage(doc: vscode.TextDocument, coverageFileMap: Map<number, string>): ICoverageLines {
		const coverageLines: ICoverageLines = {
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

	public renderHighlight(editor: vscode.TextEditor, z: ICoverageLines): void {
		editor.setDecorations(this.configStore.covered, z.full);
		editor.setDecorations(this.configStore.partialcovered, z.partial);
		editor.setDecorations(this.configStore.uncovered, z.none);
	}
}
