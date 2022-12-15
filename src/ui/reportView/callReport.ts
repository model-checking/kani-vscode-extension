// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as fs from 'fs';
import * as path from 'path';
import process = require('process');
import { setTimeout } from 'timers/promises';

import * as vscode from 'vscode';

import { checkCargoExist, getRootDir } from '../../utils';

/**
 * Call the visualize flag on the harness and render the html page
 *
 * @param commandURI - vscode command that is being executed
 * @param harnessObj - metadata about the harness
 */
export async function callViewerReport(
	commandURI: string,
	harnessObj: { harnessName: string; harnessFile: string },
): Promise<void> {
	let finalCommand: string = '';
	let searchDir: string = '';

	const platform = process.platform;
	const harnessName = harnessObj.harnessName;
	const harnessFile = harnessObj.harnessFile;

	// Detect source file
	const terminal = vscode.window.activeTerminal ?? vscode.window.createTerminal();

	if (platform === 'darwin' || platform == 'linux') {
		const responseObject = createCommand(commandURI, harnessFile, harnessName);
		finalCommand = responseObject.finalCommand;
		searchDir = responseObject.searchDir;
	}

	terminal.sendText(finalCommand);

	// Ask if they want to run this command
	// First, fix this command
	const filename: string = harnessName;

	await setTimeout(5000);
	const pythonCommand = `python3 -m http.server --directory`;

	const filePath = findPath(searchDir, filename);
	if (!filePath) {
		console.error(' Could not find the filepath for the report ');
	}
	const HTMLfilePath = path.join(filePath, 'html');

	// const url = 'http://stackoverflow.com';
	// require('child_process').exec(`open ${url}`);

	// const HTMLfilePathFull = path.join(HTMLfilePath, 'index.html');
	const fullReportCommand = pythonCommand + ` ` + HTMLfilePath;
	terminal.sendText(fullReportCommand);

	// If they do then, listen to the port yourself
	// Kill Terminal after viewing the report
	terminal.show();
}

// Check if cargo toml exists and create corresponding kani command
function createCommand(commandURI: string, harnessFile: string, harnessName: string) {
	// Check if cargo toml exists
	const isCargo = checkCargoExist();
	let finalCommand: string = '';
	let searchDir: string = '';

	if (!isCargo) {
		const command: string = commandURI === 'Kani.runViewerReport' ? 'kani' : 'cargo kani';
		finalCommand = `${command} ${harnessFile} --harness ${harnessName} --visualize`;
		searchDir = path.join(getRootDir());
	} else {
		const command: string = commandURI === 'Kani.runViewerReport' ? 'cargo kani' : 'kani';
		finalCommand = `${command} --harness ${harnessName} --visualize`;
		searchDir = path.join(getRootDir(), 'target');
	}

	return { finalCommand, searchDir };
}

// 	Find the path of the report from the harness name
function findPath(dir: string, filename: string): string {
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
