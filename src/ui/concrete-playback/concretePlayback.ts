// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import process = require('process');

import * as vscode from 'vscode';

import { KaniArguments, KaniConstants } from '../../constants';
import { checkCargoExist, getPackageName, getRootDir } from '../../utils';

/**
 * Call the visualize flag on the harness and render the html page
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
		const crateURI: string = getRootDir();
		finalCommand = `cd ${crateURI} && ${responseObject}`;
	}

	// Wait for the the visualize command to finish generating the report
	terminal.sendText(finalCommand);
}

// Check if cargo toml exists and create corresponding kani command
function createCommand(packageName: string, harnessName: string, harnessType: boolean): string {
	// Check if cargo toml exists
	const isCargo = checkCargoExist();
	const kaniArgs = `${KaniArguments.harnessFlag} ${harnessName} -p ${packageName} -Z concrete-playback --concrete-playback=inplace`;

	if (harnessType) {
		return `${KaniConstants.CargoKaniExecutableName} ${kaniArgs}`;
	} else {
		return `${KaniConstants.CargoKaniExecutableName} ${KaniArguments.testsFlag} ${kaniArgs}`;
	}
}
