// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as vscode from 'vscode';

import { KaniArguments, KaniConstants, KaniResponse } from '../constants';
import { KaniResponseError } from './kaniOutputParser';
import { createFailedDiffMessage, runKaniCommand } from './kaniRunner';

/**
 * Generate command and run `cargo-kani` on the command, and return the output status code of the sub-process
 *
 * @param harnessName - name of the harness that is to be verified
 * @param packageName - name of the package containing the harnesses
 * @param testFlag - if True, this means that it is a proof declared under #[cfg(test)]. By default, it is false for kani proofs
 * @param stubbing_args - if stubbing attribute is present on the harness, we pass this flag
 * @param qualified_name - fully qualified harness name. Example - outer::middle::inner::harness_name
 * @returns verification status (i.e success or failure)
 */
export async function runKaniHarnessInterface(
	harnessName: string,
	packageName: string,
	testFlag: boolean = false,
	stubbing_args?: boolean,
	qualified_name?: string,
): Promise<any> {
	// If we have an expanded or qualified name from the parser, then we try running kani with that
	// or else we try it with just the harness name
	if (qualified_name != undefined && qualified_name != '') {
		try {
			const fullyQualifiedCommand = createCommand(
				qualified_name,
				packageName,
				testFlag,
				stubbing_args,
			);
			const kaniOutput = await catchOutput(fullyQualifiedCommand);
			return kaniOutput;
		} catch (error) {
			if (error instanceof KaniResponseError) {
				// Try to re-run kani on just the harness name only if the response contains
				// the string that it couldn't find a harness with the expanded
				if (error.name === 'NoHarnessesError') {
					try {
						const harnessCommand = createCommand(harnessName, packageName, testFlag, stubbing_args);
						// catchOutput contains error handling already in case even the command with pure harness name fails.
						// We are just trying to reduce the output to a statusCode in this function.
						const kaniOutput = await catchOutput(harnessCommand);
						return kaniOutput;
					} catch (error) {
						return -1;
					}
				} else {
					console.error(error.message, error.cause);
					return -1;
				}
			}
		}
	} else {
		const harnessCommand = createCommand(harnessName, packageName, testFlag, stubbing_args);
		try {
			const kaniOutput = await catchOutput(harnessCommand);
			return kaniOutput;
		} catch (error) {
			return -1;
		}
	}
}

function createCommand(
	harnessName: string,
	packageName: string,
	testFlag: boolean = false,
	stubbing_args?: boolean,
): string {
	let harnessCommand = `${KaniConstants.CargoKaniExecutableName} ${KaniArguments.packageFlag} ${packageName} ${KaniArguments.harnessFlag} ${harnessName}`;
	if (testFlag) {
		harnessCommand = `${harnessCommand} ${KaniArguments.testsFlag}`;
	}

	if (stubbing_args !== undefined && stubbing_args) {
		harnessCommand = `${harnessCommand} ${KaniArguments.stubbingFlag}`;
	}

	return harnessCommand;
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
	harnessName: string,
	packageName: string,
	testFlag: boolean,
	stubbing_args?: boolean,
): Promise<KaniResponse> {
	const harnessCommand = createCommand(harnessName, packageName, testFlag, stubbing_args);
	const kaniOutput = await createFailedDiffMessage(harnessCommand);
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
		finalCommand = `${command} ${sourceFile?.fileName} --output-format terse`;
	} else {
		finalCommand = `${command}`;
	}

	terminal.sendText(finalCommand);
	terminal.show();
}

// Run a command and capture the command line output into a string
async function catchOutput(command: string): Promise<any> {
	try {
		const process = await runKaniCommand(command);
		return process;
	} catch (error) {
		console.error(error);
		throw error;
	}
}
