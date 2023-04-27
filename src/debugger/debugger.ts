// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import { exec, execFile, execFileSync, execSync } from 'child_process';
import { error } from 'console';
import path from 'path';
import { cwd, stderr, stdout } from 'process';

import * as vscode from 'vscode';

import { getPackageName } from '../model/runCargoTest';
import { getRootDir, getRootDirURI } from '../utils';

const debugOutput = vscode.window.createOutputChannel('Debug');

async function getCargoPath(): Promise<string | null> {
	return new Promise<string | null>((resolve, reject) => {
		execFile('which', ['cargo'], (error, path) => {
			if (error) {
				console.error('Error occurred while retrieving cargo path:', error);
				// eslint-disable-next-line no-null/no-null
				resolve(null);
			} else {
				resolve(path);
			}
		});
	});
}

async function getBinaryPath(functionName: string): Promise<string | undefined> {
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
	const binaryName = await getBinaryPath(functionName);
	console.log(binaryName);

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

// /home/ubuntu/test-concrete/target/debug/deps/test_concrete-6387540054886e23 kani_concrete_playback_check_estimate_size_14615086421508420155 --exact --nocapture

// "type": "lldb",
// "request": "launch",
// "name": "test kani_concrete_playback_check_estimate_size_14615086421508420155",
// "program": "${workspaceFolder}/target/debug/deps/test_concrete-6387540054886e23",
// "args": [
//   "kani_concrete_playback_check_estimate_size_14615086421508420155",
//   "--exact",
//   "--nocapture"
// ],
// "cwd": "${workspaceFolder}",
// "sourceMap": {},
// "sourceLanguages": [
//   "rust"
// ],
// "env": {
//   "RUST_BACKTRACE": "short",
//   "USER": "ubuntu",
//   "SSH_CLIENT": "205.251.233.238 15613 22",
//   "XDG_SESSION_TYPE": "tty",
//   "SHLVL": "1",
//   "MOTD_SHOWN": "pam",
//   "HOME": "/home/ubuntu",
//   "DBUS_SESSION_BUS_ADDRESS": "unix:path=/run/user/1000/bus",
//   "LOGNAME": "ubuntu",
//   "_": "/home/ubuntu/.vscode-server/bin/704ed70d4fd1c6bd6342c436f1ede30d1cff4710/node",
//   "XDG_SESSION_CLASS": "user",
//   "XDG_SESSION_ID": "1",
//   "PATH": "/home/ubuntu/.vscode-server/bin/704ed70d4fd1c6bd6342c436f1ede30d1cff4710/bin/remote-cli:/home/ubuntu/.local/bin:/home/ubuntu/scripts:/home/ubuntu/.nvm/versions/node/v16.14.2/bin:/home/ubuntu/.cargo/bin:/home/ubuntu/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin",
//   "VSCODE_AGENT_FOLDER": "/home/ubuntu/.vscode-server",
//   "XDG_RUNTIME_DIR": "/run/user/1000",
//   "LANG": "C.UTF-8",
//   "SSH_AUTH_SOCK": "/run/user/1000/vscode-ssh-auth-sock-537906104",
//   "SHELL": "/bin/bash",
//   "PWD": "/home/ubuntu",
//   "SSH_CONNECTION": "205.251.233.238 15613 172.31.63.18 22",
//   "XDG_DATA_DIRS": "/usr/local/share:/usr/share:/var/lib/snapd/desktop",
//   "VSCODE_HANDLES_SIGPIPE": "true",
//   "NVM_INC": "/home/ubuntu/.nvm/versions/node/v16.14.2/include/node",
//   "LS_COLORS": "",
//   "NVM_DIR": "/home/ubuntu/.nvm",
//   "LESSCLOSE": "/usr/bin/lesspipe %s %s",
//   "LESSOPEN": "| /usr/bin/lesspipe %s",
//   "NVM_CD_FLAGS": "",
//   "NVM_BIN": "/home/ubuntu/.nvm/versions/node/v16.14.2/bin",
//   "VSCODE_AMD_ENTRYPOINT": "vs/workbench/api/node/extensionHostProcess",
//   "VSCODE_HANDLES_UNCAUGHT_ERRORS": "true",
//   "VSCODE_NLS_CONFIG": "{\"locale\":\"en\",\"osLocale\":\"en\",\"availableLanguages\":{}}",
//   "BROWSER": "/home/ubuntu/.vscode-server/bin/704ed70d4fd1c6bd6342c436f1ede30d1cff4710/bin/helpers/browser.sh",
//   "VSCODE_CWD": "/home/ubuntu",
//   "ELECTRON_RUN_AS_NODE": "1",
//   "VSCODE_IPC_HOOK_CLI": "/run/user/1000/vscode-ipc-575903cf-3a73-4e95-9268-761310a7a680.sock"
// }
// }
