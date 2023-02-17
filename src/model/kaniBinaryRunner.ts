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
 * Run Kani as a command line binary and cargo kani command as a backup option in case there are rustc errors with running single script kani
 *
 * @param rsFile - Path to the file that is to be verified
 * @param harnessName - name of the harness that is to be verified
 * @param args - arguments to Kani if provided
 * @returns verification status (i.e success or failure)
 */
export async function runKaniHarnessInterface(
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
	const kaniOutput = await catchOutput(harnessCommand);

	// output = 2 indicates there is an underlying error , example import error from rustc. Before crashing the extension completely, we try running cargo kani over the harness
	if (kaniOutput == 2) {
		vscode.window.showWarningMessage(`Switching to cargo kani as proof runner due to Kani error`);

		const crateURI = getRootDir();
		let harnessCommand = '';

		if (args === undefined || NaN) {
			harnessCommand = `cd ${crateURI} && ${KaniConstants.CargoKaniExecutableName} ${KaniArguments.harnessFlag} ${harnessName}`;
		} else {
			harnessCommand = `cd ${crateURI} && ${KaniConstants.CargoKaniExecutableName} ${KaniArguments.harnessFlag} ${harnessName} ${KaniArguments.unwindFlag} ${args}`;
		}

		// Cargo Kani Output
		const kaniOutput: number = await catchOutput(harnessCommand, true);
		return kaniOutput;
	}
	return kaniOutput;
}

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

	// Kani Output
	const kaniOutput = await catchOutput(harnessCommand);
	return kaniOutput;
}

/**
 * Run cargo Kani --tests as a command line binary for harness declared
 * under #[test]
 *
 * @param harnessName - name of the harness that is to be verified
 * @param failedCheck - If the verification has already failed, then process the kani output lazily
 * @param args - arguments to Kani if provided
 * @returns verification status (i.e success or failure)
 */
export async function runCargoKaniTest(
	harnessName: string,
	failedCheck?: boolean,
	args?: number,
): Promise<any> {
	const crateURI = getRootDir();
	let harnessCommand = '';
	if (args === undefined || NaN) {
		harnessCommand = `cd ${crateURI} && ${KaniConstants.CargoKaniExecutableName} ${KaniArguments.testsFlag} ${KaniArguments.harnessFlag} ${harnessName}`;
	} else {
		harnessCommand = `cd ${crateURI} && ${KaniConstants.CargoKaniExecutableName} ${KaniArguments.testsFlag} ${KaniArguments.harnessFlag} ${harnessName} ${KaniArguments.unwindFlag} ${args}`;
	}
	if (failedCheck) {
		const kaniOutput: KaniResponse = await captureFailedChecksForProof(harnessName, harnessCommand);
		return kaniOutput;
	} else {
		const kaniOutput: number = await catchOutput(harnessCommand);
		return kaniOutput;
	}
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
	const kaniOutput = await createFailedDiffMessage(harnessCommand);
	if (kaniOutput.failedProperty == 'error') {
		const crateURI = getRootDir();
		let harnessCommand = '';

		if (args === undefined || NaN) {
			harnessCommand = `cd ${crateURI} && ${KaniConstants.CargoKaniExecutableName} ${KaniArguments.harnessFlag} ${harnessName} --output-format terse`;
		} else {
			harnessCommand = `cd ${crateURI} && ${KaniConstants.CargoKaniExecutableName} ${KaniArguments.harnessFlag} ${harnessName} ${KaniArguments.unwindFlag} ${args} --output-format terse`;
		}
		const kaniOutput = await createFailedDiffMessage(harnessCommand);
		return kaniOutput;
	} else {
		return kaniOutput;
	}
}

// Generic function to run a command (Kani | Cargo Kani)
export async function runCommandPure(command: string): Promise<void> {
	let finalCommand = ``;

	// Detect source file
	const sourceFile = vscode.window.activeTextEditor?.document;
	const terminal = vscode.window.activeTerminal ?? vscode.window.createTerminal();

	// String template for the final command that runs in the terminal
	if (command === KaniConstants.KaniExecutableName) {
		finalCommand = `${command} ${sourceFile?.fileName} --output-format terse`;
	} else {
		finalCommand = `${command}`;
	}

	terminal.sendText(finalCommand);
	terminal.show();
}

// Run Kani and return the checks that failed as a lazy process
async function captureFailedChecksForProof(
	harnessName: string,
	harnessCommand: string,
): Promise<KaniResponse> {
	const kaniOutput: KaniResponse = await runCargoKaniCommand(harnessName, harnessCommand);
	return kaniOutput;
}

// Run a command and capture the command line output into a string
async function catchOutput(command: string, cargoKaniMode: boolean = false): Promise<number> {
	const process = await execLog(command);
	// console.log(process);
	return process;
}

// exectute the command as a command line argument
async function execLog(command: string, cargoKaniMode: boolean = false): Promise<number> {
	return new Promise((resolve, reject) => {
		execAsync(command, (error, stdout, stderr) => {
			if (stderr && !stdout) {
				if (cargoKaniMode) {
					// stderr is an output stream that happens when there are no problems executing the kani command but kani itself throws an error due to (most likely)
					// a rustc error or an unhandled kani error
					vscode.window.showErrorMessage(
						`Kani Executable Crashed due to an underlying rustc error ->\n ${stderr}`,
					);
					reject();
				} else {
					resolve(2);
				}
			} else if (error) {
				if (error.code === 1) {
					// verification failed
					// console.log("error code 1", stderr);
					resolve(1);
				} else {
					// Error is an object created by nodejs created when nodejs cannot execute the command
					vscode.window.showErrorMessage(
						`Kani Extension could not execute command ${command} due to error ->\n ${error}`,
					);
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
				vscode.window.showWarningMessage('Kani Executable Crashed while parsing error message');
				resolve({ failedProperty: 'error', failedMessages: 'error' });
			}
		});
	});
}
