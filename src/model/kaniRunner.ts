// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import * as vscode from 'vscode';

import { KaniResponse } from '../constants';
import { CommandArgs, getRootDir, splitCommand } from '../utils';
import { responseParserInterface } from './kaniOutputParser';

/**
 * Get the system resolved path to the cargo-kani command
 *
 * @param kaniCommand - Full sanitized command created by kaniCommandCreate module
 * @returns the path for the binary cargo-kani (either the installed binary or the development one)
 */
export function getKaniPath(kaniCommand: string): Promise<string> {
	const options = {
		shell: false,
	};

	return new Promise((resolve, reject) => {
		execFile('which', [kaniCommand], options, (error, stdout, stderr) => {
			if (error) {
				console.error(`execFile error: ${error}`);
				return;
			}
			if (stderr) {
				console.error(`stderr: ${stderr}`);
				return;
			}
			const cargoKaniPath = stdout.trim();
			console.log(`Cargo is located at: ${cargoKaniPath}`);

			// Check if cargo path is valid
			try {
				const stats = fs.statSync(cargoKaniPath);
				if (stats.isFile() && path.basename(cargoKaniPath) === kaniCommand) {
					resolve(path.resolve(cargoKaniPath));
				} else {
					reject(new Error(`Invalid kani path: ${cargoKaniPath}`));
				}
			} catch (err) {
				reject(err);
			}
		});
	});
}

/**
 * Function that runs `cargo kani [args]`
 *
 * @param kaniCommand - Full sanitized command created by kaniCommandCreate module
 * @returns the path for the binary cargo-kani (either the installed binary or the development one)
 */
export async function runKaniCommand(
	harnessCommand: string,
	cargoKaniMode: boolean = false,
): Promise<any> {
	// Get the full resolved path for the root directory of the crate
	const directory = path.resolve(getRootDir());
	const commmandSplit: CommandArgs = splitCommand(harnessCommand);

	// Get cargo command and args for the command to be executed
	const command = commmandSplit.commandPath;
	const args = commmandSplit.args;

	if (command == 'cargo' || command == 'cargo kani') {
		const kaniBinaryPath = await getKaniPath('cargo-kani');
		const options = {
			shell: false,
			cwd: directory,
		};

		return executeKaniProcess(kaniBinaryPath, args, options, cargoKaniMode);
	} else {
		return false;
	}
}

/**
 * Function that returns the diff message to be displayed
 *
 * @param command - Full sanitized command created by kaniCommandCreate module
 * @returns the path for the binary cargo-kani (either the installed binary or the development one)
 */
export async function createFailedDiffMessage(command: string): Promise<KaniResponse> {
	// Root dir of the crate and the command and args to be executed
	const directory = path.resolve(getRootDir());
	const commmandSplit: CommandArgs = splitCommand(command);

	// Get the args for the kani command to run
	const args = commmandSplit.args;

	// Check the command running and execute that with the full path and safe options
	if (commmandSplit.commandPath == 'cargo' || commmandSplit.commandPath == 'cargo kani') {
		const kaniBinaryPath = await getKaniPath('cargo-kani');
		const options = {
			shell: false,
			cwd: directory,
		};

		return new Promise((resolve, _reject) => {
			execFile(kaniBinaryPath, args, options, (_error, stdout, _stderr) => {
				if (stdout) {
					const responseObject: KaniResponse = responseParserInterface(stdout);
					resolve(responseObject);
				}
			});
		});
	} else {
		// Error Case
		vscode.window.showWarningMessage('Kani executable crashed while parsing error message');
		return new Promise((resolve, _reject) => {
			resolve({ failedProperty: 'error', failedMessages: 'error' });
		});
	}
}

/**
 * Function that executes the sanitized command
 *
 * @param kaniBinaryPath - Full sanitized command created by kaniCommandCreate module
 * @param args - full arg list to provide to the subprocess
 * @param options - options to pass to the cargo-kani command i.e shell, working directory
 * @param cargoKaniMode - Whether it's running in `cargo-kani` or not
 * @returns the path for the binary cargo-kani (either the installed binary or the development one)
 */
function executeKaniProcess(
	kaniBinaryPath: string,
	args: string[],
	options: any,
	cargoKaniMode: boolean,
): Promise<any> {
	return new Promise((resolve, reject) => {
		execFile(kaniBinaryPath, args, options, (error, stdout, stderr) => {
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
					resolve(1);
				} else {
					// Error is an object created by nodejs created when nodejs cannot execute the command
					vscode.window.showErrorMessage(
						`Kani Extension could not execute command due to error ->\n ${error}`,
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
