// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import GlobalConfig from '../../globalConfig';
import { CommandArgs, getRootDir, splitCommand } from '../../utils';

const { execFile } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(execFile);
const warningMessage = `Report generation is an unstable feature.
Coverage information has been disabled due recent issues involving incorrect results.`;

interface CoverageJSON {
	viewerCoverage: {
	  coverage: {
		[filePath: string]: {
		  [functionName: string]: {
			[lineNumber: string]: string;
		  };
		};
	  };
	  functionCoverage: {
		[filePath: string]: {
		  [functionName: string]: {
			hit: number;
			percentage: number;
			total: number;
		  };
		};
	  };
	  lineCoverage: {
		[filePath: string]: {
		  [lineNumber: string]: string;
		};
	  };
	  overallCoverage: {
		hit: number;
		percentage: number;
		total: number;
	  };
	};
}

export async function runCodeCoverageAction(functionName: string): Promise<void> {
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

    // console.log(processOutput);
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
	const lcovFile = convertToLcovFormat(coverage);

	const outputFilePath = '/home/ubuntu/sample-coverage/lcov.info';
	fs.writeFileSync(outputFilePath, lcovFile, {flag: 'w'});

	console.log(coverage);

	// No command found from Kani
	return undefined;
}

interface CoverageEntry {
	filePath: string;
	lineNumber: number;
	coverageStatus: string;
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

function convertToLcovFormat(coverageArray: CoverageEntry[]): string {
	let lcovReport = '';

	for (const entry of coverageArray) {
	  const { filePath, lineNumber, coverageStatus } = entry;
	  lcovReport += `SF:${filePath}\n`;
	  lcovReport += `DA:${lineNumber},${coverageStatus === 'COVERED' ? 1 : 0}\n`;
	}

	lcovReport += 'end_of_record\n';

	return lcovReport;
  }

function generateLcovFile(coverageData: any, outputFilePath: string): void {
  let lcovContent = '';

  for (const filePath in coverageData["viewer-coverage"].coverage) {
    lcovContent += `SF:${filePath}\n`;

    const functionCoverage = coverageData["viewer-coverage"]["function_coverage"][filePath];
    const lineCoverage = coverageData["viewer-coverage"]["line_coverage"][filePath];

    for (const functionName in functionCoverage) {
      lcovContent += `FN:${functionCoverage[functionName].total},${functionName}\n`;
      lcovContent += `FNDA:${functionCoverage[functionName].hit},${functionName}\n`;
    }

    for (const lineNumber in lineCoverage) {
      const hitStatus = lineCoverage[lineNumber];
      lcovContent += `DA:${lineNumber},${hitStatus === 'hit' ? 1 : 0}\n`;
    }

    lcovContent += `LF:${Object.keys(lineCoverage).length}\n`;
    lcovContent += `LH:${Object.values(lineCoverage).filter((status) => status === 'hit').length}\n`;

    lcovContent += 'end_of_record\n';
  }

  fs.writeFileSync(outputFilePath, lcovContent, {flag: 'w'});
}

// Function to parse the lcov file and extract coverage data
export function parseLcovFile(sourceFilePath: string): Map<number, number> {
	const lcovContent = fs.readFileSync('/home/ubuntu/sample-coverage/lcov.info', 'utf-8');
	const lines = lcovContent.split('\n');
	const coverageMap = new Map<number, number>();

	let isTargetSourceFile = false;
	for (const line of lines) {
	  if (line.startsWith('SF:') && line.slice(3) === sourceFilePath) {
		isTargetSourceFile = true;
	  } else if (isTargetSourceFile && line.startsWith('DA:')) {
		const [, lineNumber, executionCount] = line.match(/^DA:(\d+),(\d+)/) || [];
		if (lineNumber && executionCount) {
		  const lineNum = parseInt(lineNumber, 10);
		  const execCount = parseInt(executionCount, 10);
		  coverageMap.set(lineNum, execCount);
		}
	  } else if (isTargetSourceFile && line === 'end_of_record') {
		break; // Exit loop after processing the coverage data for the specified source file
	  }
	}

	return coverageMap;
}

// Function to highlight the source code based on coverage data
export function highlightSourceCode(doc: vscode.TextDocument, coverageMap: Map<number, number>) {
	const decorationTypeGreen = vscode.window.createTextEditorDecorationType({
	  backgroundColor: 'rgba(0, 255, 0, 0.3)', // Green background
	});

	const decorationTypeRed = vscode.window.createTextEditorDecorationType({
	  backgroundColor: 'rgba(255, 0, 0, 0.3)', // Red background
	});

	const decorationsGreen: vscode.DecorationOptions[] = [];
	const decorationsRed: vscode.DecorationOptions[] = [];

	for (let lineNum = 1; lineNum <= doc.lineCount; lineNum++) {
	  const line = doc.lineAt(lineNum - 1);

	  const coverageStatus = coverageMap.get(lineNum);

	  if(coverageStatus === undefined) {
		continue;
	  }

	  if (coverageStatus > 0) {
		const range = new vscode.Range(line.range.start, line.range.end);
		decorationsGreen.push({ range, hoverMessage: `Executions: ${coverageStatus}` });
	  } else if (coverageStatus === 0) {
		const range = new vscode.Range(line.range.start, line.range.end);
		decorationsRed.push({ range, hoverMessage: `Executions: ${coverageStatus}` });
	  }
	}

	vscode.window.activeTextEditor?.setDecorations(decorationTypeGreen, decorationsGreen);
	vscode.window.activeTextEditor?.setDecorations(decorationTypeRed, decorationsRed);
  }
