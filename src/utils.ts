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
export async function getPackageName(dirName: string): Promise<any> {
	const cargoTomlUri = vscode.Uri.file(`${dirName}/Cargo.toml`);

	try {
		const tomlFile = await vscode.workspace.fs.readFile(cargoTomlUri);
		const cargoTomlObject = toml.parse(tomlFile.toString());
		return cargoTomlObject.package?.name;
	} catch (error) {
		console.error(error);
		return undefined;
	}
}

export async function isLibraryProject(dirName: string): Promise<boolean> {
	const cargoTomlUri = vscode.Uri.file(`${dirName}/Cargo.toml`);

	try {
		const tomlFile = await vscode.workspace.fs.readFile(cargoTomlUri);
		const cargoTomlObject = toml.parse(tomlFile.toString());
		return Boolean(cargoTomlObject.lib);
	} catch (error) {
		console.error(error);
		return false;
	}
}

// Create a timestamp to help differentiate strings
export function getTimeBasedUniqueId(): string {
	const timestamp = new Date().getTime().toString();
	return timestamp;
}

// Given a filepath, get it's package name from the cargo.toml
export async function getPackageNameFromFilePath(fileUri: vscode.Uri): Promise<string> {
	const filePath = fileUri.fsPath;

	const fs = require('fs');
	let tomlsInFolder = '';
	let tomlFilePath: string = filePath;

	do {
		tomlFilePath = path.dirname(tomlFilePath);
		tomlsInFolder = fs
			.readdirSync(tomlFilePath)
			.filter((file: string) => path.extname(file) === '.toml');
	} while (!tomlsInFolder.includes('Cargo.toml') && tomlFilePath.length > 0);

	const filePackage = await getPackageName(tomlFilePath);
	return filePackage;
}

/* Split the command line invocation into the kani call and the argument array
For example - Input: '"my command" --arg1 "file with spaces.txt"';
Output: ['my command', '--arg1', 'file with spaces.txt']
*/
function parseCommand(command: string): string[] {
	const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/gu;
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

// Get the file name only from the given file path
export function extractFileName(filePath: string): string {
	const fileNameWithExtension = path.basename(filePath);
	const fileName = path.parse(fileNameWithExtension).name;
	return fileName;
}

// Generate a reverse map from harness -> fully qualified module name
// Example - harness_1 -> outer::middle::inner, harness_2 -> tests ...
export function getConcatenatedModuleName(map: Map<string, string[]>): Map<string, string> {
	const reverseMap = new Map<string, string[]>();

	// Create the reverse map
	for (const [key, values] of map) {
		for (const value of values) {
			if (reverseMap.has(value)) {
				reverseMap.get(value)!.push(key);
			} else {
				reverseMap.set(value, [key]);
			}
		}
	}

	// Get the keys with the same value
	const keysWithSameValue = new Map<string, string>();
	for (const [keys, values] of reverseMap) {
		if (values.length > 1) {
			const concatenatedValue = values.join('::');
			keysWithSameValue.set(keys, concatenatedValue);
		} else if (values.length == 1) {
			keysWithSameValue.set(keys, values.pop()!);
		}
	}

	return keysWithSameValue;
}

// Function to convert full path to relative path
export function fullToRelativePath(fullPath: string): string {
	// Get the workspace folder
	const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(fullPath));

	if (workspaceFolder) {
		// Convert to relative path
		return path.relative(workspaceFolder.uri.fsPath, fullPath);
	}

	// If not in a workspace, return the full path
	return fullPath;
}
