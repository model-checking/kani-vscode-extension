// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as fs from 'fs';
import * as path from 'path';
import { TextDecoder } from 'util';

import * as toml from 'toml';
import * as vscode from 'vscode';

const textDecoder = new TextDecoder('utf-8');
const linkToBugReportTemplate =
	'https://github.com/model-checking/kani-vscode-extension/issues/new?assignees=&labels=bug&projects=&template=bug_report.md';

export interface CommandArgs {
	commandPath: string;
	args: string[];
}

// Get the raw text from a given file given it's path uri
export const getContentFromFilesystem = async (uri: vscode.Uri): Promise<string> => {
	try {
		const rawContent: Uint8Array = await vscode.workspace.fs.readFile(uri);
		return textDecoder.decode(rawContent);
	} catch (e) {
		console.warn(`Error providing tests for ${uri.fsPath}`, e);
		return '';
	}
};

// Convert path to URI
export function getRootDirURI(): vscode.Uri {
	let crateURI: vscode.Uri = vscode.Uri.parse('');
	if (vscode.workspace.workspaceFolders !== undefined) {
		crateURI = vscode.workspace.workspaceFolders[0].uri;
		return crateURI;
	}

	return crateURI;
}

// Get the workspace of the current directory
export function getRootDir(): string {
	let crateURI: vscode.Uri = vscode.Uri.parse('');
	if (vscode.workspace.workspaceFolders !== undefined) {
		crateURI = vscode.workspace.workspaceFolders[0].uri;
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

export function countOccurrences(largerString: string, substring: string): number {
	let count = 0;
	let startIndex = 0;

	while (true) {
		startIndex = largerString.indexOf(substring, startIndex);

		if (startIndex === -1) {
			// Substring not found
			break;
		}

		count++;
		startIndex += substring.length;
	}

	return count;
}

// Return the constructed kani invokation and the argument array
export function splitCommand(command: string): CommandArgs {
	const parts = parseCommand(command);
	let commandPath = parts[0];
	if (commandPath == 'cargo') {
		if (parts.length > 1 && parts[1] == 'kani') {
			const args = parts.slice(2);
			commandPath = 'cargo kani';
			return { commandPath, args };
		} else {
			return { commandPath, args: [] };
		}
	} else if (commandPath == 'kani' && parts.length > 1) {
		const args = parts.slice(1);
		return { commandPath, args };
	} else {
		return { commandPath, args: [] };
	}
}

export function extractFunctionName(line: string): string {
	const lineSplit = line.split(' ');

	for (let index = 0; index < lineSplit.length; index++) {
		if (lineSplit[index].startsWith('kani_concrete_playback')) {
			const functionNameRaw = lineSplit[index];
			const functionName = functionNameRaw.split('(').at(0)!;
			return functionName;
		}
	}

	return '';
}

// Get the package name for the workspace from cargo.toml
export async function getPackageName(): Promise<any> {
	const dirName = getRootDir();
	const cargoTomlUri = vscode.Uri.file(`${dirName}/Cargo.toml`);

	try {
		const buffer = await vscode.workspace.fs.readFile(cargoTomlUri);
		const cargoToml = buffer.toString();
		const cargoTomlObject = toml.parse(cargoToml);
		return cargoTomlObject.package?.name;
	} catch (error) {
		console.error(error);
		return undefined;
	}
}

// Create a timestamp to help differentiate strings
export function getTimeBasedUniqueId(): string {
	const timestamp = new Date().getTime().toString();
	return timestamp;
}

/* Split the command line invocation into the kani call and the argument array
For example - Input: '"my command" --arg1 "file with spaces.txt"';
Output: ['my command', '--arg1', 'file with spaces.txt']
*/
function parseCommand(command: string): string[] {
	const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
	const parts = [];
	let match;
	while ((match = regex.exec(command))) {
		parts.push(match[1] || match[2] || match[0]);
	}
	return parts;
}

// Show an error message with a button that links to the bug report template
// used for new issues related to bugs in the Kani VSCode extension repository.
export async function showErrorWithReportIssueButton(message: string): Promise<void> {
	const response = await vscode.window.showErrorMessage(message, 'Report Issue');
	if (response == 'Report Issue') {
		const uriLink = vscode.Uri.parse(linkToBugReportTemplate);
		vscode.env.openExternal(uriLink);
	}
}
