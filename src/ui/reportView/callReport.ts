// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as fs from 'fs';
import * as path from 'path';
import process = require('process');

import * as vscode from 'vscode';

import { KaniArguments, KaniConstants } from '../../constants';
import { getKaniPath } from '../../model/kaniRunner';
import { CommandArgs, checkCargoExist, getRootDir, splitCommand } from '../../utils';

const { execFile } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(execFile);
const warningMessage = `Report generation is an unstable feature.
Coverage information has been disabled due recent issues involving incorrect results.`;

interface htmlMetaData {
	finalCommand: string;
	searchDir: string;
}

interface visualizeResult {
	isLocal: boolean;
	path?: string;
	command?: string;
}

interface reportMetadata {
	statusCode: number;
	result?: visualizeResult;
	error?: string;
}

/**
 * Call the visualize flag on the harness and render the html page
 *
 * @param commandURI - vscode command that is being executed
 * @param harnessObj - metadata about the harness
 */
export async function callViewerReport(
	commandURI: string,
	harnessObj: {
		harnessName: string;
		harnessFile: string;
		harnessType: boolean;
	},
): Promise<void> {
	let finalCommand: string = '';
	let searchDir: string = '';

	const platform: NodeJS.Platform = process.platform;
	const harnessName: string = harnessObj.harnessName;
	const harnessType: boolean = harnessObj.harnessType;

	// Detect source file
	const terminal = vscode.window.activeTerminal ?? vscode.window.createTerminal();

	// Generate the final visualize command for the supported platforms
	if (platform === 'darwin' || platform == 'linux') {
		const responseObject: htmlMetaData = createCommand(commandURI, harnessName, harnessType);
		const crateURI: string = getRootDir();
		finalCommand = `${responseObject.finalCommand}`;
		searchDir = responseObject.searchDir;
	}

	// Wait for the visualize command to finish generating the report
	const processOutput: reportMetadata = await runVisualizeCommand(finalCommand, harnessName);
	if (processOutput.statusCode != 0) {
		showVisualizeError(processOutput);
		return;
	}
	showReportMetadata(terminal, processOutput);
}

// Show an error depending on the code we received
function showVisualizeError(output: reportMetadata): void {
	switch (output.statusCode) {
		// Could not run the visualize command
		case 1:
			vscode.window.showErrorMessage(
				`Could not generate report due to execution error: ${output.error}`,
			);
			break;
		// Could run the command, but the file generated could not be verified or was generated at wrong location
		case 2:
			vscode.window.showErrorMessage(`Could not find path to the report file: ${output.error}`);
			break;
	}
	return;
}

// Shows an option to open the report in a browser. The process depends on
// whether the extension executes on a local or remote environment.
async function showReportMetadata(
	terminal: vscode.Terminal,
	output: reportMetadata,
): Promise<void> {
	if (output.result?.isLocal) {
		// Shows a message with a button. Clicking the button opens the report
		// in a browser.
		const response = await vscode.window.showInformationMessage(
			'Report has been generated',
			'Open in Browser',
		);
		if (response == 'Open in Browser') {
			const uriPath = vscode.Uri.file(output.result?.path ?? '');
			vscode.env.openExternal(uriPath);
		}
	} else {
		// Sends a command to the terminal that will start an HTTP server.
		// VSCode automatically detects this and shows a message that allows
		// you to open the report in a browser.
		terminal.sendText(output.result?.command ?? '');
		terminal.show();
	}
}

// Check if cargo toml exists and create corresponding kani command
function createCommand(
	commandURI: string,
	harnessName: string,
	harnessType: boolean,
): htmlMetaData {
	// Check if cargo toml exists
	let finalCommand: string = '';
	let searchDir: string = '';

	if (harnessType) {
		const command: string = commandURI === 'Kani.runViewerReport' ? 'cargo kani' : 'kani';
		finalCommand = `${command} --harness ${harnessName} --enable-unstable --visualize`;
		searchDir = path.join(getRootDir(), 'target');
	} else {
		finalCommand = `${KaniConstants.CargoKaniExecutableName} ${KaniArguments.testsFlag} ${KaniArguments.harnessFlag} ${harnessName} --enable-unstable --visualize`;
		searchDir = path.join(getRootDir(), 'target');
	}

	return { finalCommand, searchDir };
}

/**
 * Run the visualize command to generate the report, parse the output and return the result
 *
 * @param command - the cargo kani | kani command to run --visualize
 * @returns - the result of executing the visualize command and parsing the output
 */
async function runVisualizeCommand(command: string, harnessName: string): Promise<reportMetadata> {
	try {
		// Get the full resolved path for the root directory of the crate
		const directory = path.resolve(getRootDir());
		const commmandSplit: CommandArgs = splitCommand(command);

		// Get args for the command to be executed
		const args = commmandSplit.args;

		const options = {
			shell: false,
			cwd: directory,
		};

		const kaniBinaryPath = await getKaniPath('cargo-kani');
		vscode.window.showInformationMessage(`Generating viewer report for ${harnessName}`);
		vscode.window.showWarningMessage(warningMessage);
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
async function parseReportOutput(stdout: string): Promise<visualizeResult | undefined> {
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

			// Determine if the environment is remote
			if (process.env.SSH_CONNECTION !== undefined) {
				// Generate the command using the path to the directory
				const reportDir = reportPath.replace('/index.html', '');
				return {
					isLocal: false,
					command: 'python3 -m http.server --directory ' + reportDir,
				};
			} else {
				return { isLocal: true, path: reportPath };
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
