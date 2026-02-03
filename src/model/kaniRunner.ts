// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import * as vscode from 'vscode';

import { KaniResponse } from '../constants';
import GlobalConfig from '../globalConfig';
import {
	CommandArgs,
	getRootDir,
	getTimeBasedUniqueId,
	showErrorWithReportIssueButton,
	splitCommand,
} from '../utils';
import {
	KaniResponseError,
	checkOutputForError,
	responseParserInterface,
} from './kaniOutputParser';

// Store the output from process into a object with this type
interface CommandOutput {
	stdout: string;
	stderr: string;
	errorCode: any;
	error: any;
}

// Displays the version of kani being used to the user as a status bar icon
export async function getKaniVersion(pathKani: string): Promise<void> {
	try {
		execFile(pathKani, ['--version'], (error, stdout, stderr) => {
			if (error) {
				console.error(`Error: ${error}`);
				return;
			}

			if (stdout) {
				// Split the stdout by whitespace to separate words
				const words = stdout.split(/\s+/u);
				// Find the word that contains the version number
				const versionWord = words.find((word) => /\d+(\.\d+){1,}/u.test(word))!;
				const versionNum: number = parseFloat(versionWord);

				console.log(`Kani version is ${versionNum}`);

				if (versionNum < 0.29) {
					vscode.window.showWarningMessage(
						'Please install Kani 0.29 or later using the instructions at https://model-checking.github.io/kani/install-guide.html and/or make sure it is in your PATH.',
					);
				}

				const versionMessage = `$(gear~spin) Kani ${versionWord} being used to verify`;

				vscode.window.setStatusBarMessage(versionMessage, 6000);
				return;
			}

			console.log(`stdout: ${stdout}`);
			console.error(`stderr: ${stderr}`);
		});
	} catch (error) {
		// Ignore command error
		return;
	}
	return;
}

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
				reject(new Error(`Kani executable was not found in PATH.`));
				return;
			}
			if (stderr) {
				console.error(`stderr: ${stderr}`);
				return;
			}
			const cargoKaniPath = stdout.trim();

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
	const commandSplit: CommandArgs = splitCommand(harnessCommand);

	// Get cargo command and args for the command to be executed
	const command = commandSplit.commandPath;
	const args = commandSplit.args;

	if (command == 'cargo' || command == 'cargo kani') {
		const globalConfig = GlobalConfig.getInstance();
		const kaniBinaryPath = globalConfig.getFilePath();
		const options = {
			shell: false,
			cwd: directory,
		};

		try {
			const executionResult = await executeKaniProcess(
				kaniBinaryPath,
				args,
				options,
				cargoKaniMode,
			);
			return executionResult;
		} catch (error: any) {
			showErrorWithReportIssueButton(`Could not run Kani on harness: ${error}`);
			throw error;
		}
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
	const commandSplit: CommandArgs = splitCommand(command);

	// Get the args for the kani command to run
	const args = commandSplit.args;

	// Check the command running and execute that with the full path and safe options
	if (commandSplit.commandPath == 'cargo' || commandSplit.commandPath == 'cargo kani') {
		const globalConfig = GlobalConfig.getInstance();
		const kaniBinaryPath = globalConfig.getFilePath();
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
		showErrorWithReportIssueButton('Kani executable crashed while parsing error message');
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
async function executeKaniProcess(
	kaniBinaryPath: string,
	args: string[],
	options: any,
	cargoKaniMode: boolean,
): Promise<any> {
	return new Promise((resolve, reject) => {
		execFile(kaniBinaryPath, args, options, (error, stdout, stderr) => {
			void (async () => {
				// Store the output of the process into an object
				const output: CommandOutput = {
					stdout: stdout.toString(),
					stderr: stderr.toString(),
					errorCode: error?.code,
					error: error,
				};

			// Send output to diagnostics and return if there is an error in stdout
			// this means that the command could not be executed.
			try {
				const result = checkOutputForError(output.stdout, output.stderr);
				if (result) {
					sendErrorToChannel(output, args);
					reject(new Error(error?.message));
				}
			} catch (error) {
				if (error instanceof KaniResponseError) {
					if (error.name === 'KaniCompilationError') {
						sendErrorToChannel(output, args);
						reject(new Error(error?.message));
					}
				}
				reject(error);
			}
			// Send output to output channel specific to the harness
			sendOutputToChannel(output, args);

			if (stderr && !stdout) {
				if (cargoKaniMode) {
					// stderr is an output stream that happens when there are no problems executing the kani command but kani itself throws an error due to (most likely)
					// a rustc error or an unhandled kani error
					showErrorWithReportIssueButton(
						`Kani Executable Crashed due to an underlying rustc error ->\n ${stderr}`,
					);
					reject();
				} else {
					resolve(2);
				}
			} else if (error) {
				if (error.code === 1) {
					resolve(1);
				} else {
					// Error is an object created by nodejs created when nodejs cannot execute the command
					showErrorWithReportIssueButton(
						`Kani Extension could not execute command due to error ->\n ${error}`,
					);
					reject();
				}
			} else {
				// verification successful
				resolve(0);
			}
			})().catch((err: unknown) => {
				reject(err);
			});
		});
	});
}

// Creates a unique name and adds a channel for the harness output to Output Logs
export function sendErrorToChannel(output: CommandOutput, args: string[]): void {
	if (args.length == 0) {
		return;
	}
	const harnessName = args.at(args.length - 1)!;

	// Create unique ID for the output channel
	const timestamp = getTimeBasedUniqueId();
	const channel = vscode.window.createOutputChannel(`Error (Kani): ${harnessName} - ${timestamp}`);

	// Append stdout to the output channel
	channel.appendLine(output.error?.message);
	// Open channel but don't change focus
	channel.show(true);
}

// Creates a unique name and adds a channel for the harness output to Output Logs
export function sendOutputToChannel(output: CommandOutput, args: string[]): void {
	if (args.length == 0) {
		return;
	}
	const harnessName = args.at(args.length - 1)!;

	// Create unique ID for the output channel
	const timestamp = getTimeBasedUniqueId();
	const channel = vscode.window.createOutputChannel(`Output (Kani): ${harnessName} - ${timestamp}`);

	// Append stdout to the output channel
	channel.appendLine(output.stdout);

	// Access the configuration
	const config = vscode.workspace.getConfiguration('Kani');
	const showOutputWindow = config.get('showOutputWindow');

	// Use the value to show or hide the output window
	if (showOutputWindow) {
		// Open channel but don't change focus
		channel.show(true);
	}
}
