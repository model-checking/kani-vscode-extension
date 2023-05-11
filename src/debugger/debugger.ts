// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import { execFile, execFileSync, execSync } from 'child_process';
import path from 'path';

import * as vscode from 'vscode';

import { getPackageName, getRootDir, getRootDirURI } from '../utils';

// Extracts the path for the cargo artifact for the user's crate which we shall plug into the debugger
// by connecting to the vscode debugger controller
async function getBinaryPath(): Promise<string | undefined> {
	try {
		// Run 'cargo' command to get the binary path
		const cargoPath = await getPackageName();
		const directory = path.resolve(getRootDir());
		const options = {
			shell: false,
			cwd: directory,
		};

		// <https://github.com/model-checking/kani-vscode-extension/issues/68#issue-1706506359>
		const cargoTestCommand: string = `RUSTFLAGS="--cfg=kani" cargo +nightly test --no-run --message-format=json`;
		const output = execSync(`cd ${directory} && ${cargoTestCommand}`);

		const outputString = output.toString();

		const lines = outputString.trim().split('\n');
		const jsonMessages = lines.map((line: string) => JSON.parse(line));

		/**
		 * The artifact we're interested is present in the second to last message in the Json response from cargo
		 * The JSON looks something like this -
		 * [
		 * 		...,
		 * 		{
		 * 			reason: "compiler-artifact",
		 * 			package_id: "test-concrete 0.1.0 (path+file:///home/ubuntu/test-concrete)",
		 * 		...
		 * 		},
		 * 		{
		 * 			reason: 'build-finished',
		 * 			success: true
		 * 		}
		 * ]
		*/

		const packageCompilationArtifact = jsonMessages[jsonMessages.length - 2];

		if (!packageCompilationArtifact.package_id.includes(cargoPath)) {
			return '';
		}
		const executablePath = packageCompilationArtifact.executable;
		// Find the metadata message
		return executablePath;
	} catch (error) {
		console.error('Error occurred while retrieving the binary path:', error);
		return undefined;
	}
}

export async function connectToDebugger(functionName: string) {
	// The binary that is being referred to here, is the binary present in the cargo artifacts.
	// It looks like this - kani_concrete_playback_check_estimate_size_14615086421508420155
	const binaryName = await getBinaryPath();

	// These config options allow VSCode to attach the binary artifact to lldb's debugger extension, with
	// kani extension acting as the bridge.
	vscode.debug.startDebugging(vscode.workspace.getWorkspaceFolder(getRootDirURI()), {
		type: 'lldb',
		request: 'launch',
		name: 'test ${programName}',
		program: binaryName,
		args: [functionName, '--exact', '--nocapture'],
		cwd: '${workspaceFolder}',
		sourceLanguages: ['rust'],
		env: {
			RUST_BACKTRACE: 'short',
			RUSTFLAGS: 'cfg=kani',
		},
	});
}
