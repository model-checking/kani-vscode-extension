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

	let playbackCommand: string = `${kaniBinaryPath} --enable-unstable --visualize --harness ${functionName}`;
	const processOutput = await runVisualizeCommand(playbackCommand, functionName);

    vscode.window.showInformationMessage(`Done with generating json`);
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
		const kaniBinaryPath = globalConfig.getFilePath();

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
	const kaniOutputArray: string[] = kaniOutput.split('\n');
	const searchString: string = 'Report written to: ';

	for (const outputString of kaniOutputArray) {
		if (outputString.startsWith(searchString)) {
			const reportPath: string = outputString.substring(searchString.length);

			// Check if the path exists as expected
			const filePathExists: boolean = await checkPathExists(reportPath);
			if (!filePathExists) {
				return undefined;
			}

            // get json file for the harness
            const grandparentDirectory = getGrandparentDirectoryPath(reportPath);
            const jsonPath = path.join(grandparentDirectory, "/json/viewer-coverage.json");

            const jsonPathexists = await checkPathExists(jsonPath);
            if(jsonPathexists) {
                console.log(jsonPath);
                const data = readJsonFile(jsonPath);

				const outputFilePath = '/home/ubuntu/sample-coverage/lcov.info';
				const coverageData: CoverageJSON = data as CoverageJSON;

				generateLcovFile(coverageData, outputFilePath);
				console.log(`LCOV file generated: ${outputFilePath}`);
            }
		}
	}

	// No command found from Kani
	return undefined;
}

// Util function to find the path of the report from the harness name
async function checkPathExists(serverCommand: string): Promise<boolean> {
	// Kani returns a structured string, using that structure
	// to find the filepath embedded in the command string
	const lastSlashIndex: number = serverCommand.lastIndexOf('/');

	if (lastSlashIndex !== -1) {
		const match: string = serverCommand.substring(lastSlashIndex);
		if (match) {
			// Even if the path can be extracted from Kani's output, it's not
			// necessary that the html file was created, so this needs to be checked
			const exists: boolean = fs.existsSync(match[0]);
			return exists;
		} else {
			return false;
		}
	} else {
		return false;
	}
}

function getGrandparentDirectoryPath(filePath: string): string {
    const parentDirectory = path.dirname(filePath);
    const grandparentDirectory = path.dirname(parentDirectory);
    return grandparentDirectory;
}

function readJsonFile(filePath: string) {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(fileContents);
    return jsonData;
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
