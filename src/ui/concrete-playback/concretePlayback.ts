import * as fs from 'fs';
import * as path from 'path';
import process = require('process');

import * as vscode from 'vscode';

import { KaniArguments, KaniConstants } from '../../constants';
import { checkCargoExist, getRootDir } from '../../utils';

const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

/**
 * Call the visualize flag on the harness and render the html page
 *
 * @param commandURI - vscode command that is being executed
 * @param harnessObj - metadata about the harness
 */
export async function callConcretePlayback(
	commandURI: string,
	harnessObj: { harnessName: string; harnessFile: string; harnessType: boolean },
): Promise<void> {
	let finalCommand: string = '';
	const searchDir: string = '';

	const platform: NodeJS.Platform = process.platform;
	const harnessName: string = harnessObj.harnessName;
	const harnessFile: string = harnessObj.harnessFile;
	const harnessType: boolean = harnessObj.harnessType;

	// Detect source file
	const terminal = vscode.window.activeTerminal ?? vscode.window.createTerminal();

	// Generate the final visualize command for the supported platforms
	if (platform === 'darwin' || platform == 'linux') {
		const responseObject: string = createCommand(commandURI, harnessFile, harnessName, harnessType);
		const crateURI: string = getRootDir();
		finalCommand = `cd ${crateURI} && ${responseObject}`;
	}

	// Wait for the the visualize command to finish generating the report
	terminal.sendText(finalCommand);
	terminal.show();
}

// Check if cargo toml exists and create corresponding kani command
function createCommand(
	commandURI: string,
	harnessFile: string,
	harnessName: string,
	harnessType: boolean,
): string {
	// Check if cargo toml exists
	const isCargo = checkCargoExist();
	let finalCommand: string = '';

	if (!isCargo) {
		const command: string = commandURI === 'Kani.runConcretePlayback' ? 'kani' : 'cargo kani';
		finalCommand = `${command} ${harnessFile} --harness ${harnessName} --enable-unstable --concrete-playback=inplace`;
	} else {
		if (harnessType) {
			const command: string = commandURI === 'Kani.runConcretePlayback' ? 'kani' : 'cargo kani';
			finalCommand = `${command} ${harnessFile} --harness ${harnessName} --enable-unstable --concrete-playback=inplace`;
		} else {
			finalCommand = `${KaniConstants.CargoKaniExecutableName} ${KaniArguments.testsFlag} ${KaniArguments.harnessFlag} ${harnessName} --visualize`;
		}
	}

	return finalCommand;
}
