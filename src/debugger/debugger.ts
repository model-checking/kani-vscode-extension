// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import { execSync } from 'child_process';
import path from 'path';

import * as vscode from 'vscode';

import { getPackageName } from '../model/runCargoTest';
import { getRootDir, getRootDirURI } from '../utils';

async function getBinaryPath(): Promise<string | undefined> {
	try {
		// Run 'cargo' command to get the binary path

		// this is just metadata that needs to be stored, shouldnt waste time calculating it again
		const cargoPath = await getPackageName();
		// same here
		const directory = path.resolve(getRootDir());
		const options = {
			shell: false,
			cwd: directory,
		};

		// todo -> execFile this
		const cargoTestCommand: string = `RUSTFLAGS="--cfg=kani" cargo +nightly test --no-run --message-format=json`;
		const output = execSync(`cd ${directory} && ${cargoTestCommand}`);

		const outputString = output.toString();

		const lines = outputString.trim().split('\n');
		const jsonMessages = lines.map((line: string) => JSON.parse(line));
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

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function connectToDebugger(functionName: string) {
	const binaryName = await getBinaryPath();
	console.log(binaryName);

	// /home/ubuntu/test-concrete/target/debug/deps/test_concrete-6387540054886e23 kani_concrete_playback_check_estimate_size_14615086421508420155 --exact --nocapture

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
		// other configuration options specific to Rust debugging with CodeLLDB
	});
}
