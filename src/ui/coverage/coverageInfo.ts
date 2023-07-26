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

	const playbackCommand: string = `${kaniBinaryPath} ${currentFileUri} --enable-unstable --coverage --harness ${functionName}`;
	const processOutput = await runCoverageCommand(playbackCommand, functionName);

	if(processOutput.statusCode == 0) {
		const coverageOutputArray = processOutput.result;

		const formatted = parseCoverageFormatted(coverageOutputArray);
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
async function runCoverageCommand(command: string, harnessName: string): Promise<any> {
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
		const kaniBinaryPath = await getKaniPath('kani');

		vscode.window.showInformationMessage(
			`Kani located at ${kaniBinaryPath} being used for verification`,
		);

		vscode.window.showInformationMessage(`Generating coverage for ${harnessName}`);
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

	const coverageResults = kaniOutputArray.at(1);

	if(coverageResults === undefined) {
		return '';
	}

	const coverageResultsArray = coverageResults.split('\n')!;

	const coverage = parseCoverageData(coverageResultsArray);

	// No command found from Kani
	return coverage;
}

interface CoverageEntry {
	filePath: string;
	lineNumber: number;
	coverageStatus: string;
}

enum CoverageStatus {
	Full = "FULL",
	Partial = "PARTIAL",
	None = "NONE"
}

// Function to parse the new format and convert it into a coverageMap
export function parseCoverageFormatted(coverageData: CoverageEntry[]): Map<number, CoverageStatus> {
	const coverageMap = new Map<number, CoverageStatus>();

	for (const item of coverageData) {
		switch (item.coverageStatus) {
			case "FULL":
				coverageMap.set(item.lineNumber, CoverageStatus.Full);
				break;
			case "PARTIAL":
				coverageMap.set(item.lineNumber, CoverageStatus.Partial);
				break;
			case "NONE":
				coverageMap.set(item.lineNumber, CoverageStatus.None);
				break;
			default:
				break;
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
	public highlightSourceCode(doc: vscode.TextDocument, coverageMap: Map<number, CoverageStatus>, dispose_bool: boolean): void {
		const decorationsGreen: vscode.Range[] = [];
		const decorationsRed: vscode.Range[] = [];
		const decorationsYellow: vscode.Range[] = [];

		for (let lineNum = 1; lineNum <= doc.lineCount; lineNum++) {
			const line = doc.lineAt(lineNum - 1);

			const status = coverageMap.get(lineNum);

			if(status === undefined) {
				continue;
			}

			const range = new vscode.Range(line.range.start, line.range.end);

			switch (status) {
				case CoverageStatus.Full:
					decorationsGreen.push(range);
					break;
				case CoverageStatus.Partial:
					decorationsYellow.push(range);
					break;
				case CoverageStatus.None:
					decorationsRed.push(range);
					break;
				default:
					break;
			}
		}

		if(!dispose_bool) {
			this.renderHighlight(decorationsGreen, decorationsRed, decorationsYellow);
		} else{
			this.renderHighlight([], [], []);
		}
	}

	public renderHighlight(decorationsGreen: vscode.Range[], decorationsRed: vscode.Range[], decorationsYellow: vscode.Range[]): void {
		vscode.window.activeTextEditor?.setDecorations(this.configStore.covered, decorationsGreen);
		vscode.window.activeTextEditor?.setDecorations(this.configStore.partialcovered, decorationsYellow);
		vscode.window.activeTextEditor?.setDecorations(this.configStore.uncovered, decorationsRed);

	}
}
