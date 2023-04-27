// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as vscode from 'vscode';

import { KaniArguments, KaniConstants, KaniResponse } from '../constants';
import { createFailedDiffMessage, runKaniCommand } from './kaniRunner';

/**
 * Run Kani as a command line binary and cargo kani command as a backup option in case there are rustc errors with running single script kani
 *
 * @param rsFile - Path to the file that is to be verified
 * @param harnessName - name of the harness that is to be verified
 * @param args - arguments to Kani if provided
 * @returns verification status (i.e success or failure)
 */
export async function runKaniHarnessInterface(harnessName: string, args?: number): Promise<any> {
	let harnessCommand = '';
	if (args === undefined || isNaN(args)) {
		harnessCommand = `${KaniConstants.CargoKaniExecutableName} ${KaniArguments.harnessFlag} ${harnessName}`;
	} else {
		harnessCommand = `${KaniConstants.CargoKaniExecutableName} ${KaniArguments.harnessFlag} ${harnessName} ${KaniArguments.unwindFlag} ${args}`;
	}
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
	let harnessCommand = '';
	if (args === undefined || isNaN(args)) {
		harnessCommand = `${KaniConstants.CargoKaniExecutableName} ${KaniArguments.testsFlag} ${KaniArguments.harnessFlag} ${harnessName}`;
	} else {
		harnessCommand = `${KaniConstants.CargoKaniExecutableName} ${KaniArguments.testsFlag} ${KaniArguments.harnessFlag} ${harnessName} ${KaniArguments.unwindFlag} ${args}`;
	}
	if (failedCheck) {
		const kaniOutput: KaniResponse = await createFailedDiffMessage(harnessCommand);
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
	harnessName: string,
	args?: number,
): Promise<KaniResponse> {
	let harnessCommand = '';

	if (args === undefined || isNaN(args)) {
		harnessCommand = `${KaniConstants.CargoKaniExecutableName} ${KaniArguments.harnessFlag} ${harnessName}`;
	} else {
		harnessCommand = `${KaniConstants.CargoKaniExecutableName} ${KaniArguments.harnessFlag} ${harnessName} ${KaniArguments.unwindFlag} ${args}`;
	}
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
async function catchOutput(command: string, cargoKaniMode: boolean = false): Promise<number> {
	const process = await runKaniCommand(command);
	return process;
}
