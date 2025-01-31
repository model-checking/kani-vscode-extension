// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import { execFile } from 'child_process';
import path = require('path');
import process = require('process');

import * as vscode from 'vscode';

import { KaniArguments, KaniConstants } from '../../constants';
import GlobalConfig from '../../globalConfig';
import { CommandArgs, getPackageName, getRootDir, splitCommand } from '../../utils';

/**
 * Call the concrete playback feature in Kani.
 *
 * @param commandURI - vscode command that is being executed
 * @param harnessObj - metadata about the harness
 */
export async function callConcretePlayback(harnessObj: {
	harnessName: string;
	harnessFile: string;
	harnessType: boolean;
}): Promise<void> {
	let finalCommand: string = '';

	const platform: NodeJS.Platform = process.platform;
	const packageName = await getPackageName(getRootDir());
	const harnessName: string = harnessObj.harnessName;
	const harnessType: boolean = harnessObj.harnessType;

	// Detect source file
	const terminal = vscode.window.activeTerminal ?? vscode.window.createTerminal();

	// Generate the final concrete playback command for the supported platforms
	if (platform === 'darwin' || platform == 'linux') {
		const responseObject: string = createCommand(packageName, harnessName, harnessType);
		finalCommand = `${responseObject}`;
	}

	// Wait for the the playback command to finish
	executePlaybackCommand(finalCommand);
}

// Check if cargo toml exists and create corresponding kani command
function createCommand(packageName: string, harnessName: string, harnessType: boolean): string {
	// Check if cargo toml exists
	const kaniArgs = `${KaniArguments.harnessFlag} ${harnessName} -p ${packageName} -Z concrete-playback --concrete-playback=inplace`;
	if (harnessType) {
		return `${KaniConstants.CargoKaniExecutableName} ${kaniArgs}`;
	} else {
		return `${KaniConstants.CargoKaniExecutableName} ${KaniArguments.testsFlag} ${kaniArgs}`;
	}
}

// Generate the unit test from the playback command
function executePlaybackCommand(finalCommand: string): void {
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	statusBarItem.text = '$(gear~spin) Generating concrete test...';
	statusBarItem.show();

	const commandSplit: CommandArgs = splitCommand(finalCommand);

	const options = {
		shell: false,
		cwd: path.resolve(getRootDir()),
	};

	const globalConfig = GlobalConfig.getInstance();
	const kaniBinaryPath = globalConfig.getFilePath();

	const process = execFile(kaniBinaryPath, commandSplit.args, options, (error, stdout, stderr) => {
		// Process execution has finished
		// Hide the status bar icon
		statusBarItem.hide();

		if (error) {
			console.error(error);
			return;
		}

		// Process the command output (stdout) if needed
		if (stdout) {
			console.log(stdout);
		}
	});

	// Handle when the process is terminated externally
	process.on('exit', () => {
		// Hide the status bar icon
		statusBarItem.hide();
	});
}
