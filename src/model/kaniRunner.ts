// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import * as vscode from 'vscode';

import { KaniResponse } from '../constants';
import { CommandArgs, getRootDir, splitCommand } from '../utils';
import { responseParserInterface } from './kaniOutputParser';

// Get the path to the cargo command
export function getKaniPath(kaniCommand: string): Promise<string> {
	return new Promise((resolve, reject) => {
		execFile('which', [kaniCommand], (error, stdout, stderr) => {
			if (error) {
				console.error(`execFile error: ${error}`);
				return;
			}
			if (stderr) {
				console.error(`stderr: ${stderr}`);
				return;
			}
			const cargoPath = stdout.trim();
			console.log(`Cargo is located at: ${cargoPath}`);

			// Check if cargo path is valid
			try {
				const stats = fs.statSync(cargoPath);
				if (stats.isFile() && path.basename(cargoPath) === kaniCommand) {
					resolve(cargoPath);
				} else {
					reject(new Error(`Invalid kani path: ${cargoPath}`));
				}
			} catch (err) {
				reject(err);
			}
		});
	});
}

export async function runKaniCommand(
	harnessCommand: string,
	cargoKaniMode: boolean = false,
): Promise<any> {
	const directory = path.resolve(getRootDir());
	const commmandSplit: CommandArgs = splitCommand(harnessCommand);
	const command = commmandSplit.commandPath;
	const args = commmandSplit.args;
	let kaniBinaryPath = '';

	if (command == 'cargo kani') {
		const kaniBinaryPath = await getKaniPath('cargo-kani');
		const options = {
			shell: false,
			cwd: directory,
		};

		executeKaniProcess(kaniBinaryPath, args, options, cargoKaniMode);
	} else if (command == 'kani') {
		kaniBinaryPath = await getKaniPath(command);
		const options = {
			shell: false,
		};

		executeKaniProcess(kaniBinaryPath, args, options, cargoKaniMode);
	} else {
		return false;
	}
}

// Return Diff Message that is displayed when verification fails
export async function createFailedDiffMessage(command: string): Promise<KaniResponse> {
	const directory = path.resolve(getRootDir());
	const commmandSplit: CommandArgs = splitCommand(command);
	const kaniCommand = commmandSplit.commandPath;
	const args = commmandSplit.args;

	const options = {
		shell: false,
	};

	return new Promise((resolve, reject) => {
		execFile(kaniCommand, args, options, (error, stdout, stderr) => {
			if (stdout) {
				console.log(stdout);
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
