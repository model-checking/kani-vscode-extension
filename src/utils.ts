// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as fs from 'fs';
import * as path from 'path';
import { TextDecoder } from 'util';

import { Uri, workspace } from 'vscode';

const textDecoder = new TextDecoder('utf-8');

export interface CommandArgs {
	commandPath: string;
	args: string[];
}

// Get the raw text from a given file given it's path uri
export const getContentFromFilesystem = async (uri: Uri): Promise<string> => {
	try {
		const rawContent: Uint8Array = await workspace.fs.readFile(uri);
		return textDecoder.decode(rawContent);
	} catch (e) {
		console.warn(`Error providing tests for ${uri.fsPath}`, e);
		return '';
	}
};

// Convert path to URI
export function getRootDirURI(): Uri {
	let crateURI: Uri = Uri.parse('');
	if (workspace.workspaceFolders !== undefined) {
		crateURI = workspace.workspaceFolders[0].uri;
		return crateURI;
	}

	return crateURI;
}

// Get the workspace of the current directory
export function getRootDir(): string {
	let crateURI: Uri = Uri.parse('');
	if (workspace.workspaceFolders !== undefined) {
		crateURI = workspace.workspaceFolders[0].uri;
		return crateURI.fsPath;
	}

	return crateURI.fsPath;
}

// Check if the current crate has cargo.toml or not for switching between kani and cargo kani
export function checkCargoExist(): boolean {
	const rootDir: string = getRootDir();
	if (fs.existsSync(path.join(rootDir, 'Cargo.toml'))) {
		return true;
	} else {
		return false;
	}
}

export function splitCommand(command: string): CommandArgs {
	const parts = command.trim().split(/\s+/);
	const commandPath = parts[0];
	const args = parts.slice(1);
	return { commandPath, args };
}
