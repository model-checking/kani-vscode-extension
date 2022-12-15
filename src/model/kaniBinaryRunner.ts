// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import { exec } from 'child_process';

import * as vscode from 'vscode';

import { KaniArguments, KaniConstants, KaniResponse } from '../constants';
import { getRootDir } from '../utils';
import { runCargoKaniCommand } from './cargokaniBinaryRunner';
import { responseParserInterface } from './kaniOutputParser';

const execAsync = exec;

/**
 * Run Kani as a command line binary
 *
 * @param rsFile - Path to the file that is to be verified
 * @param harnessName - name of the harness that is to be verified
 * @param args - arguments to Kani if provided
 * @returns verification status (i.e success or failure)
 */
export async function runKaniHarness(
	rsFile: string,
	harnessName: string,
	args?: number,
): Promise<any> {
	let harnessCommand = '';
	if (args !== undefined || NaN) {
		harnessCommand = `${KaniConstants.KaniExecutableName} ${rsFile} ${KaniArguments.harnessFlag} ${harnessName} ${KaniArguments.unwindFlag} ${args}`;
	} else {
		harnessCommand = `${KaniConstants.KaniExecutableName} ${rsFile} ${KaniArguments.harnessFlag} ${harnessName}`;
	}
	console.log(harnessCommand);
	const kaniOutput = await catchOutput(harnessCommand);
	return kaniOutput;
}

/**
 * Run cargo Kani --tests as a command line binary for harness declared
 * under #[test]
 *
 * @param harnessName - name of the harness that is to be verified
 * @param args - arguments to Kani if provided
 * @returns verification status (i.e success or failure)
 */
export async function runCargoKaniTest(harnessName: string, args?: number): Promise<any> {
	const crateURI = getRootDir();
	// console.log(crateURI);
	let harnessCommand = '';
	if (args === undefined || NaN) {
		harnessCommand = `cd ${crateURI} && ${KaniConstants.CargoKaniExecutableName} ${KaniArguments.testsFlag} ${KaniArguments.harnessFlag} ${harnessName}`;
	} else {
		harnessCommand = `cd ${crateURI} && ${KaniConstants.CargoKaniExecutableName} ${KaniArguments.testsFlag} ${KaniArguments.harnessFlag} ${harnessName} ${KaniArguments.unwindFlag} ${args}`;
	}
	console.log(harnessCommand);
	const kaniOutput = await catchOutput(harnessCommand);
	return kaniOutput;
}

/**
 * Run cargo Kani --tests as a command line binary and capture failed checks
 *
 * @param harnessName - name of the harness that is to be verified
 * @param args - arguments to Kani if provided
 * @returns processed response from Kani
 */
export function runCargoKaniTestForFailedChecks(
	harnessName: string,
	args?: number,
): Promise<KaniResponse> {
	const crateURI = getRootDir();
	let harnessCommand = '';
	if (args === undefined || NaN) {
		harnessCommand = `cd ${crateURI} && ${KaniConstants.CargoKaniExecutableName} ${KaniArguments.testsFlag} ${KaniArguments.harnessFlag} ${harnessName}`;
	} else {
		harnessCommand = `cd ${crateURI} && ${KaniConstants.CargoKaniExecutableName} ${KaniArguments.testsFlag} ${KaniArguments.harnessFlag} ${harnessName} ${KaniArguments.unwindFlag} ${args}`;
	}
	const kaniOutput = captureFailedChecksForTests(harnessName, harnessCommand);
	return kaniOutput;
}

/**
 *
 * Return failed checks as a lazy process when run by test case
 *
 * @param rsFile - Path to the file that is to be verified
 * @param harnessName - name of the harness that is to be verified
 * @param args - arguments to Kani if provided
 * @returns
 */
export async function captureFailedChecks(
	rsFile: string,
	harnessName: string,
	args?: number,
): Promise<KaniResponse> {
	let harnessCommand = '';
	if (args === undefined) {
		harnessCommand = `${KaniConstants.KaniExecutableName} ${rsFile} ${KaniArguments.harnessFlag} ${harnessName}`;
	} else {
		harnessCommand = `${KaniConstants.KaniExecutableName} ${rsFile} ${KaniArguments.harnessFlag} ${harnessName} ${KaniArguments.unwindFlag} ${args}`;
	}
	const kaniOutput: KaniResponse = await createFailedDiffMessage(harnessCommand);
	return kaniOutput;
}

// Generic function to run a command (Kani | Cargo Kani)
export async function runCommandPure(command: string): Promise<void> {
	let finalCommand = ``;

	// Detect source file
	const sourceFile = vscode.window.activeTextEditor?.document;
	const terminal = vscode.window.activeTerminal ?? vscode.window.createTerminal();

	// String template for the final command that runs in the terminal
	if (command === KaniConstants.KaniExecutableName) {
		//TODO: Refactor to using inputs
		finalCommand = `${command} ${sourceFile?.fileName} --output-format terse`;
	} else {
		finalCommand = `${command}`;
	}

	terminal.sendText(finalCommand);
	terminal.show();
}

// Run Kani and return the checks that failed as a lazy process
async function captureFailedChecksForTests(
	harnessName: string,
	harnessCommand: string,
): Promise<KaniResponse> {
	const kaniOutput: KaniResponse = await runCargoKaniCommand(harnessName, harnessCommand);
	return kaniOutput;
}

// Run a command and capture the command line output into a string
async function catchOutput(command: string): Promise<number> {
	const process = await execLog(command);
	// console.log(process);
	return process;
}

// exectute the command as a command line argument
async function execLog(command: string): Promise<number> {
	return new Promise((resolve, reject) => {
		execAsync(command, (error, stdout, stderr) => {
			if (error) {
				if (error.code === 1) {
					// verification failed
					// console.log("error code 1", stderr);
					resolve(1);
				} else {
					vscode.window.showErrorMessage('Kani Executable Crashed');
					reject();
				}
			} else {
				// verification successful
				resolve(0);
			}
		});
	});
}

// Return Diff Message that is displayed when verification fails
async function createFailedDiffMessage(command: string): Promise<KaniResponse> {
	return new Promise((resolve, reject) => {
		execAsync(command, (error, stdout, stderr) => {
			if (stdout) {
				const responseObject: KaniResponse = responseParserInterface(stdout);
				resolve(responseObject);
			} else {
				// Error Case
				vscode.window.showErrorMessage('Kani Executable Crashed');
				reject(`Kani Error`);
			}
		});
	});
}
