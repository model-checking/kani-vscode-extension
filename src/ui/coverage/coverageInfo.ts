// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import GlobalConfig from '../../globalConfig';
import { CommandArgs, getRootDir, splitCommand } from '../../utils';
import Config from './config';

const { execFile } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(execFile);
const warningMessage = `Report generation is an unstable feature.
Coverage information has been disabled due recent issues involving incorrect results.`;

export async function runCodeCoverageAction(renderer: Renderer, functionName: string): Promise<void> {
	const taskName = `Kani Playback: ${functionName}`;

	const taskDefinition: vscode.TaskDefinition = {
		type: 'cargo',
		command: 'test',
		args: [functionName],
	};

	const globalConfig = GlobalConfig.getInstance();
	const kaniBinaryPath = globalConfig.getFilePath();

	const activeEditor = vscode.window.activeTextEditor;
	const currentFileUri = activeEditor?.document.uri.fsPath;

	let playbackCommand: string = `${kaniBinaryPath} ${currentFileUri} --enable-unstable --coverage --harness ${functionName}`;
	const processOutput = await runVisualizeCommand(playbackCommand, functionName);

	if(processOutput.statusCode == 0) {
		console.log(processOutput.result);

		const formatted = parseCoverageFormatted(processOutput.result);
		const editor = vscode.window.activeTextEditor;
		if(editor) {
			renderer.highlightSourceCode(editor.document, formatted, false);
		}
	}
}

/**
 * Run the visualize command to generate the report, parse the output and return the result
 *
 * @param command - the cargo kani | kani command to run --visualize
 * @returns - the result of executing the visualize command and parsing the output
 */
async function runVisualizeCommand(command: string, harnessName: string): Promise<any> {
	try {
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
		const kaniBinaryPath = `/home/ubuntu/kani/scripts/kani`;

		vscode.window.showInformationMessage(`Generating viewer report for ${harnessName}`);
		const { stdout, stderr } = await execPromise(kaniBinaryPath, args, options);
		const parseResult = await parseReportOutput(stdout);
		if (parseResult === undefined) {
			return { statusCode: 2, result: undefined, error: stderr };
		}
		console.error(`stderr: ${stderr}`);

		return { statusCode: 0, result: parseResult };
	} catch (error) {
		console.error(`exec error: ${error}`);
		return { statusCode: 1, result: undefined, error: error as string };
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
async function parseReportOutput(stdout: string): Promise<any | undefined> {
	const kaniOutput: string = stdout;
	const kaniOutputArray: string[] = kaniOutput.split('Coverage Results:\n');

	const coverageResults = kaniOutputArray.at(1)?.split('\n')!;

	const coverage = parseCoverageData(coverageResults);

	// No command found from Kani
	return coverage;
}

interface CoverageEntry {
	filePath: string;
	lineNumber: number;
	coverageStatus: string;
}

// Function to parse the new format and convert it into a coverageMap
export function parseCoverageFormatted(coverageData: CoverageEntry[]): Map<number, number> {
	const coverageMap = new Map<number, number>();

	for (const item of coverageData) {
		if (item.coverageStatus === 'COVERED') {
			coverageMap.set(item.lineNumber, 1);
		} else if (item.coverageStatus === 'UNCOVERED') {
			coverageMap.set(item.lineNumber, 0);
		}
	}

	return coverageMap;
}


function parseCoverageData(data: string[]): CoverageEntry[] {
	const coverageEntries: CoverageEntry[] = [];

	for (const entry of data) {
	  const parts = entry.split(', ');

	  if (parts.length === 3) {
		const [filePath, lineNumberStr, coverageStatus] = parts;
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

export class Renderer {

	private configStore: Config;

	constructor(
        configStore: Config,
    ) {
        this.configStore = configStore;
    }

	// Function to highlight the source code based on coverage data
	public highlightSourceCode(doc: vscode.TextDocument, coverageMap: Map<number, number>, dispose_bool: boolean) {
		const decorationsGreen: vscode.Range[] = [];
		const decorationsRed: vscode.Range[] = [];

		for (let lineNum = 1; lineNum <= doc.lineCount; lineNum++) {
			const line = doc.lineAt(lineNum - 1);

			const coverageStatus = coverageMap.get(lineNum);

			if(coverageStatus === undefined) {
				continue;
			}

			if (coverageStatus > 0) {
				const range = new vscode.Range(line.range.start, line.range.end);
				decorationsGreen.push(range);
			} else if (coverageStatus === 0) {
				const range = new vscode.Range(line.range.start, line.range.end);
				decorationsRed.push(range);
			}
		}

		if(!dispose_bool) {
			this.renderHighlight(decorationsGreen, decorationsRed);
		} else{
			this.renderHighlight([], []);
		}
	}

	public renderHighlight(decorationsGreen: vscode.Range[], decorationsRed: vscode.Range[]) {
		vscode.window.activeTextEditor?.setDecorations(this.configStore.covered, decorationsGreen);
		vscode.window.activeTextEditor?.setDecorations(this.configStore.uncovered, decorationsRed);
	}
}
