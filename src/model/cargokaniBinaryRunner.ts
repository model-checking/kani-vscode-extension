// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import { exec } from 'child_process';
import { KaniResponse } from '../constants';
import { readFileSync, writeFileSync } from 'fs';
import { promisify } from 'util';
import { getRootDir } from '../utils';
import { responseParserInterface } from './kaniOutputParser';

const execAsync = promisify(exec);

// Run the cargo kani command output, and return the parsed output in a object
export function runCargoKaniCommand(harnessName: string, harnessCommand: string) {
	// const outputTempFile = getRootDir() + '/target/' + `${harnessName}.tmp`;
	const rootDir = getRootDir();
	const outputTempFile = `${rootDir}/target/${harnessName}.tmp`;
	return runCommandStoreOutput(harnessCommand, outputTempFile);
}

// Run command to write the output to temp file and return the read response object
async function runCommandStoreOutput(command: string, outputFilePath: string): Promise<KaniResponse> {
    try {
        // This async call may fail.
        const output = await execAsync(command);
		writeFileSync(outputFilePath, output.stdout);
		return readFromTempFile(outputFilePath);
    }
	catch (error) {
		const response: KaniResponse = {
			failedProperty: "",
			failedMessages: ""
		};
		return response;
	}
}

// Read cargo kani output from temp file and store it in the response object
function readFromTempFile(inputFilePath: string): KaniResponse {
	const kaniOutput = readFileSync(inputFilePath).toString();
	const failureResponse: KaniResponse = responseParserInterface(kaniOutput);
	return failureResponse;
}
