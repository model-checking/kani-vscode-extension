// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as fs from 'fs';
import * as path from 'path';
import process = require('process');

import * as vscode from 'vscode';

import { KaniArguments, KaniConstants } from '../../constants';
import { checkCargoExist, getRootDir } from '../../utils';

const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

interface htmlMetaData {
	finalCommand: string;
	searchDir: string;
}

interface visualizeOutput {
	statusCode: number;
	serverCommand: string;
}

/**
 * Call the visualize flag on the harness and render the html page
 *
 * @param commandURI - vscode command that is being executed
 * @param harnessObj - metadata about the harness
 */
export async function callViewerReport(
	commandURI: string,
	harnessObj: { harnessName: string; harnessFile: string; harnessType: boolean },
): Promise<void> {
	let finalCommand: string = '';
	let searchDir: string = '';

	const platform: NodeJS.Platform = process.platform;
	const harnessName: string = harnessObj.harnessName;
	const harnessFile: string = harnessObj.harnessFile;
	const harnessType: boolean = harnessObj.harnessType;

	// Detect source file
	const terminal = vscode.window.activeTerminal ?? vscode.window.createTerminal();

	// Generate the final visualize command for the supported platforms
	if (platform === 'darwin' || platform == 'linux') {
		const responseObject: htmlMetaData = createCommand(
			commandURI,
			harnessFile,
			harnessName,
			harnessType,
		);
		const crateURI: string = getRootDir();
		finalCommand = `cd ${crateURI} && ${responseObject.finalCommand}`;
		searchDir = responseObject.searchDir;
	}

	// Wait for the the visualize command to finish generating the report
	const processOutput: visualizeOutput = await runVisualizeCommand(finalCommand);
	if (processOutput.statusCode == 1 || processOutput.serverCommand == '') {
		// Could not run the visualize command, throw an error
		vscode.window.showErrorMessage('Could not generate report');
		return;
	}

	// Check if the HTML path that is to be served to the user exists as expected
	const filename: string = harnessName;
	const filePath: string = await findPath(searchDir, filename);
	if (filePath === '') {
		vscode.window.showErrorMessage('Could not find the filepath for the report');
		return;
	}

	// Send the command to the user which asks them if they want to view the report on the browser
	terminal.sendText(processOutput.serverCommand);
	terminal.show();
}

// Check if cargo toml exists and create corresponding kani command
function createCommand(
	commandURI: string,
	harnessFile: string,
	harnessName: string,
	harnessType: boolean,
): htmlMetaData {
	// Check if cargo toml exists
	const isCargo = checkCargoExist();
	let finalCommand: string = '';
	let searchDir: string = '';

	if (!isCargo) {
		const command: string = commandURI === 'Kani.runViewerReport' ? 'kani' : 'cargo kani';
		finalCommand = `${command} ${harnessFile} --harness ${harnessName} --visualize`;
		searchDir = path.join(getRootDir());
	} else {
		if (harnessType) {
			const command: string = commandURI === 'Kani.runViewerReport' ? 'cargo kani' : 'kani';
			finalCommand = `${command} --harness ${harnessName} --visualize`;
			searchDir = path.join(getRootDir(), 'target');
		} else {
			finalCommand = `${KaniConstants.CargoKaniExecutableName} ${KaniArguments.testsFlag} ${KaniArguments.harnessFlag} ${harnessName} --visualize`;
			searchDir = path.join(getRootDir(), 'target');
		}
	}

	return { finalCommand, searchDir };
}

// 	Find the path of the report from the harness name
async function findPath(dir: string, filename: string): Promise<string> {
	const files: string[] = fs.readdirSync(dir);

	for (const file of files) {
		const filePath: string = path.join(dir, file);

		if (fs.statSync(filePath).isDirectory()) {
			console.log(filePath);
			if (file.includes(filename)) {
				return filePath;
			}
		} else {
			continue;
		}
	}

	return '';
}

/**
 * Run the visualize command to generate the report, parse the output to return the python server command and status
 *
 * @param command - the cargo kani | kani command to run --visualize
 * @returns - A promise of the python command and the status code; Promise<visualizeOutput>
 */
async function runVisualizeCommand(command: string): Promise<visualizeOutput> {
	try {
		vscode.window.showWarningMessage('Generating viewer report');
		const { stdout, stderr } = await execPromise(command);
		const serveReportCommand: string = await parseReportOutput(stdout);
		console.error(`stderr: ${stderr}`);

		return { statusCode: 0, serverCommand: serveReportCommand };
	} catch (error) {
		console.error(`exec error: ${error}`);
		return { statusCode: 1, serverCommand: '' };
	}
}

/**
 * Search for the python command contained in Kani's output and throw it onto the user's terminal
 *
 * @param stdout - kani stdout output that contains the full python command to be run by the terminal
 * @returns - python command that looks like "python3 -m http.server --path path"
 */
async function parseReportOutput(stdout: string): Promise<string> {
	const kaniOutput: string = stdout;
	const kaniOutputArray: string[] = kaniOutput.split('\n');
	const searchString: string = 'python3';

	for (const outputString of kaniOutputArray) {
		if (outputString.includes(searchString)) {
			const command: string = outputString.split(searchString)[1];
			return searchString + command;
		}
	}

	// No command found from Kani
	return '';
}
