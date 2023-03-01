// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import { exec, execFile } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import path = require('path');
import { promisify } from 'util';

import { KaniResponse } from '../constants';
import { CommandArgs, getRootDir, splitCommand } from '../utils';
import { responseParserInterface } from './kaniOutputParser';
import { getKaniPath } from './kaniRunner';

const execAsync = promisify(exec);
const execAsyncFile = promisify(execFile);

/**
 * Run the cargo kani command output, and return the parsed output in a object
 *
 * @param harnessName - Name of the harness, to be passed as the argument
 * @param harnessCommand - The command to execute
 * @returns Processed Kani output, which is passed to the UI
 *
 */
export function runCargoKaniCommand(
	harnessName: string,
	harnessCommand: string,
): Promise<KaniResponse> {
	const rootDir: string = getRootDir();
	const outputTempFile: string = `${rootDir}/target/${harnessName}.tmp`;
	return runCommandStoreOutput(harnessCommand, outputTempFile);
}

/**
 * Run command to write the output to temp file and return the read response object
 *
 * @param command - The command to execute
 * @param outputFilePath - Path to temp file that contains kani output
 * @returns Processed Kani output from the filepath provided
 */
async function runCommandStoreOutput(
	command: string,
	outputFilePath: string,
): Promise<KaniResponse> {
	try {
		// This async call may fail.
		const directory = path.resolve(getRootDir());
		const commmandSplit: CommandArgs = splitCommand(command);
		const kaniBinaryPath = await getKaniPath('cargo-kani');
		const options = {
			shell: false,
			cwd: directory,
		};

		const output = await execAsyncFile(kaniBinaryPath, commmandSplit.args, options);
		writeFileSync(outputFilePath, output.stdout);
		return readFromTempFile(outputFilePath);
	} catch (error) {
		const response: KaniResponse = {
			failedProperty: '',
			failedMessages: '',
		};
		return response;
	}
}

// Read cargo kani output from temp file and store it in the response object
function readFromTempFile(inputFilePath: string): KaniResponse {
	const kaniOutput: string = readFileSync(inputFilePath).toString();
	const failureResponse: KaniResponse = responseParserInterface(kaniOutput);
	return failureResponse;
}
