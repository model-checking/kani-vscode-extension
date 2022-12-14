import * as vscode from 'vscode';
import { exec } from 'child_process';
import { readFileSync } from 'fs';
import { KaniResponse } from '../constants';
import { responseParserInterface } from './kaniOutputParser';
import { runCargoKaniCommand } from './cargokaniBinaryRunner';
import { getRootDir } from '../utils';
import { KaniConstants, KaniArguments } from '../constants';

const execAsync = exec;

// Run Kani as a command line binary
export async function runKani(rsFile: string | unknown): Promise<any> {
	const kaniOutput = await catchOutput(`${KaniConstants.KaniExecutableName} ${rsFile}`);
	return kaniOutput;
}

// Run Kani as a command line binary
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

// Run cargo Kani --tests as a command line binary
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

// Run cargo Kani --tests as a command line binary and capture failed checks
export function runCargoKaniTestForFailedChecks(
	harnessName: string,
	args?: number,
): Promise<KaniResponse> {
	const crateURI = getRootDir();
	// console.log(crateURI);
	let harnessCommand = '';
	if (args === undefined || NaN) {
		harnessCommand = `cd ${crateURI} && ${KaniConstants.CargoKaniExecutableName} ${KaniArguments.testsFlag} ${KaniArguments.harnessFlag} ${harnessName}`;
	} else {
		harnessCommand = `cd ${crateURI} && ${KaniConstants.CargoKaniExecutableName} ${KaniArguments.testsFlag} ${KaniArguments.harnessFlag} ${harnessName} ${KaniArguments.unwindFlag} ${args}`;
	}
	const kaniOutput = captureFailedChecksForTests(harnessName, harnessCommand);
	return kaniOutput;
}

// Run Cargo Kani as a command line binary for --test proofs
export function runKaniHarnessTestOnTerminal(harnessName: string) {
	const terminal = vscode.window.activeTerminal ?? vscode.window.createTerminal();
	const harnessCommand = `${KaniConstants.CargoKaniExecutableName} ${KaniArguments.testsFlag} ${KaniArguments.harnessFlag} ${harnessName}`;
	terminal.sendText(harnessCommand);
	terminal.show();
}

export function runKaniHarnessTest(harnessName: string) {
	runKaniHarnessTestOnTerminal(harnessName);
}

// Run Kani and return the checks that failed as a lazy process
export async function captureFailedChecksForTests(
	harnessName: string,
	harnessCommand: string,
): Promise<KaniResponse> {
	const kaniOutput: KaniResponse = await runCargoKaniCommand(harnessName, harnessCommand);
	return kaniOutput;
}

// Run Kani and return the checks that failed as a lazy process
export async function captureFailedChecks(
	rsFile: string,
	harnessName: string,
	args?: number,
): Promise<KaniResponse> {
	let harnessCommand = '';
	if (args === undefined || NaN) {
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

// Generic function to run a command (Kani | Cargo Kani)
export async function runCommandTemps(): Promise<void> {
	if (vscode.workspace.workspaceFolders !== undefined) {
		const f: string = vscode.workspace.workspaceFolders[0].uri.fsPath;
		const metadataPath = `lib.kani-metadata.json`;
		const jsonFileName = `${f}/src/${metadataPath}`;

		const finaldata = readJSONSync(jsonFileName);

		finaldata.proof_harnesses.forEach((harness: { prettyName: any }) => {
			console.log(harness.prettyName);
		});
	}
}

// Run a command and capture the command line output into a string
async function catchOutput(command: string) {
	const process = await execLog(command);
	// console.log(process);
	return process;
}

// exectute the command as a command line argument
async function execLog(command: string) {
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

// Read file as a json
function readJSONSync(filename: string) {
	const result = readFileSync(filename, 'utf-8');
	const jsonData = JSON.parse(result);
	return jsonData;
}
