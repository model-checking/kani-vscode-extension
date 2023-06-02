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
export async function runKaniHarnessInterface(
	harnessName: string,
	packageName: string,
	testFlag: boolean = false,
	stubbing_args?: boolean,
	qualified_name?: string,
): Promise<any> {
	// Implement disambiguation logic here
	if (qualified_name != undefined && qualified_name != '') {
		try {
			const fullyQualifiedCommand = createCommand(
				qualified_name,
				packageName,
				testFlag,
				stubbing_args,
			);
			console.log(`Fully qualified name is ${fullyQualifiedCommand}`);
			const kaniOutput = await catchOutput(fullyQualifiedCommand);
			return kaniOutput;
		} catch (error) {
			try {
				const harnessCommand = createCommand(harnessName, packageName, testFlag, stubbing_args);
				console.log(`Just the harness name is (backup) ${harnessCommand}`);
				const kaniOutput = await catchOutput(harnessCommand);
				return kaniOutput;
			} catch (error) {
				return -1;
			}
		}
	} else {
		const harnessCommand = createCommand(harnessName, packageName, testFlag, stubbing_args);
		try {
			console.log(`Just the harness name is (NOT backup) ${harnessCommand}`);
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
	let harnessCommand = '';
	if (!testFlag) {
		if (stubbing_args === undefined || !stubbing_args) {
			harnessCommand = `${KaniConstants.CargoKaniExecutableName} ${KaniArguments.packageFlag} ${packageName} ${KaniArguments.harnessFlag} ${harnessName}`;
		} else {
			harnessCommand = `${KaniConstants.CargoKaniExecutableName} ${KaniArguments.unstableFormatFlag} ${KaniArguments.stubbingFlag} ${KaniArguments.packageFlag} ${packageName} ${KaniArguments.harnessFlag} ${harnessName}`;
		}
	} else {
		if (stubbing_args === undefined || !stubbing_args) {
			harnessCommand = `${KaniConstants.CargoKaniExecutableName} ${KaniArguments.testsFlag} ${KaniArguments.packageFlag} ${packageName}  ${KaniArguments.harnessFlag} ${harnessName}`;
		} else {
			harnessCommand = `${KaniConstants.CargoKaniExecutableName} ${KaniArguments.testsFlag} ${KaniArguments.unstableFormatFlag} ${KaniArguments.stubbingFlag} ${KaniArguments.packageFlag} ${packageName} ${KaniArguments.harnessFlag} ${harnessName}`;
		}
	}

	return harnessCommand;
}

// /**
//  * Run cargo Kani --tests as a command line binary for harness declared
//  * under #[test]
//  *
//  * @param harnessName - name of the harness that is to be verified
//  * @param failedCheck - If the verification has already failed, then process the kani output lazily
//  * @param args - arguments to Kani if provided
//  * @returns verification status (i.e success or failure)
//  */
// export async function runCargoKaniTest(
// 	harnessName: string,
// 	packageName: string,
// 	stubbing_args?: boolean,
// 	qualified_name?: string,
// ): Promise<any> {
// 	// Implement disambiguation logic here
// 	if (qualified_name != undefined && qualified_name != '') {
// 		try {
// 			const fullyQualifiedCommand = createCommand(qualified_name, packageName, true, stubbing_args);
// 			console.log(`Fully qualified name is ${fullyQualifiedCommand}`);
// 			const kaniOutput = await catchOutput(fullyQualifiedCommand);
// 			return kaniOutput;
// 		} catch (error) {
// 			try {
// 				const harnessCommand = createCommand(harnessName, packageName, true, stubbing_args);
// 				console.log(`Just the harness name is (backup) ${harnessCommand}`);
// 				const kaniOutput = await catchOutput(harnessCommand);
// 				return kaniOutput;
// 			} catch (error) {
// 				return -1;
// 			}
// 	}
// 	} else {
// 		const harnessCommand = createCommand(harnessName, packageName, true, stubbing_args);
// 		try {
// 			console.log(`Just the harness name is (NOT backup) ${harnessCommand}`);
// 			const kaniOutput = await catchOutput(harnessCommand);
// 			return kaniOutput;
// 		} catch (error) {
// 			return -1;
// 		}
// 	}
// }

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
async function catchOutput(command: string, cargoKaniMode: boolean = false): Promise<any> {
	try {
		const process = await runKaniCommand(command);
		return process;
	} catch (error) {
		return new Error('compilation failed');
	}
}
