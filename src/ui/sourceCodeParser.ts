// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as assert from 'assert';

import Parser from "tree-sitter";
import * as vscode from 'vscode';

import { countOccurrences} from '../utils';
import { FileMetaData, HarnessMetadata } from "./sourceMap";

// Parse for kani::proof helper function
const proofRe = /kani::proof.*((.|\n)*?){/gm;
const testRe = /#\[test].*((.|\n)*?){/gm;
const kaniConfig = '#[cfg_attr(kani';
const functionModifiers = ['pub', 'async', 'unsafe', 'const', 'extern'];
const target = "attribute_item";
const Rust = require("tree-sitter-rust");
const parser = new Parser();
parser.setLanguage(Rust);

// use the tree sitter to get attributes
function getAttributeFromRustFile(file: string): any {
	const tree = parser.parse(file);
	const nodes = tree.rootNode.namedChildren;

	const harnesses = searchParseTreeForFunctions(tree.rootNode);
 	const search_results = searchParseTree(tree.rootNode);
	return search_results;
}

// Search if there exists a kani attribute
function searchParseTree(node: any) : any {

	// check for the kani::proof attribute
	const results = [];
	if (node.type === target) {
		if(countOccurrences(node.text, "kani::proof") == 1)
		{
			results.push(node);
		}
	  } else if (node.namedChildren) {
		for (let i = 0; i < node.namedChildren.length; i++) {
		  const result = searchParseTree(node.namedChildren[i]);
		  if (result.length != 0) {
			results.push(...result);
		  }
		}
	  }
	return results;
}

// Do DFS to get all harnesses
function searchParseTreeForFunctions(node: any) : any[] {

	const results: any[] = [];
	if(!node.namedChildren) {
		return results;
	}
	const harness_results = findHarnesses(node.namedChildren);
	if(harness_results.length > 0)
	{
		results.push(...harness_results);
	}
	for (let i = 0; i < node.namedChildren.length; i++) {
		if(node.namedChildren[i].namedChildren){
			const result = searchParseTreeForFunctions(node.namedChildren[i]);
			if (result.length != 0) {
				results.push(...result);
			}
		}
	}
	return results;
}

function findHarnesses(strList: any[]): any {
	const result: any[] = [];
	for (let i = 0; i < strList.length; i++) {
		if (strList[i].type == "attribute_item" && strList[i].text.includes("kani::proof")) {
			for (let j = i; j < strList.length; j++) {
				if (strList[j].type == "function_item") {
					result.push(strList[j]);
					break;
				}
			}
		}
	}
	return result;
}

// Search if there exists a kani attribute
function checkforKani(node: any) : boolean {

	// check for the kani::proof attribute
	if (node.type === target && countOccurrences(node.text, "kani::proof") == 1) {
		return true;
	} else if (node.namedChildren) {
		for (let i = 0; i < node.namedChildren.length; i++) {
		  	if(checkforKani(node.namedChildren[i])) {
				return true;
			}
			else {
				continue;
			}
		}
	}
	return false;
}


function fillMetadataForFile(harnesses: HarnessMetadata[]): void {
	for(const harness of harnesses) {
		fillMetadataValue(harness);
	}
}

function fillMetadataValue(harness: HarnessMetadata): void {
	for(const attribute of harness.attributes) {
		if(attribute.includes("kani::unwind")) {
			const unwindValue = extractUnwindValueNew(attribute);
			harness.args.unwind_value = unwindValue;
		}
		else if(attribute.includes("kani::solver")) {
			const solverName = extractSolverValueNew(attribute);
			harness.args.solver = solverName;
		}
		else {
			break;
		}
	}
}

// Match source text for Kani annotations
export const checkTextForProofs = (content: string): boolean => {
	const tree = parser.parse(content);
	return checkforKani(tree.rootNode);
};

/**
 * Find kani proof and bolero proofs and extract metadata out of them from source text
 *
 * @param text - raw source text from a file
 * @param events - events that trigger parsing and extracting the harness metadata
 */
export const parseRustfile = (
	text: string,
	events: {
		onTest(range: vscode.Range, name: string, harnessType: boolean, harnessArgs?: number): void;
	},
): void => {
	const allProofs = text.matchAll(proofRe);
	const allTests = text.matchAll(testRe);

	// Create harness metadata for the entire file
	const allAttributes: HarnessMetadata[] = getAttributeFromRustFile(text);
	const harnessesSortedByLine: HarnessMetadata[] = [...allAttributes].sort((a,b) => a.endPosition.row - b.endPosition.row);

	// Fill argument values
	fillMetadataForFile(harnessesSortedByLine);
	console.log(JSON.stringify(harnessesSortedByLine, undefined, 2));

	const harnessMap = new Map<string, string>();
	const map = new Map<string, string>();
	const harnessList: Set<string> = new Set<string>([]);
	const testList: Set<string> = new Set<string>([]);
	const testMap = new Map<string, string>();
	const unwindMap = new Map<string, number>();

	// Bolero proofs
	for (const test of allTests) {
		const [harnessLineRaw, mapLineValue]: [string, string] = getHarnessInformationFromTest(test);
		const unwindValue: number = extractUnwindValueFromTest(harnessLineRaw);
		let harnessLine: string = extractFunctionLineFromTest(harnessLineRaw);
		const harnessName: string = getHarnessNameFromHarnessLine(harnessLine);
		harnessLine = harnessLine.replace(/\s+/g, '').concat('{');
		testList.add(harnessName);
		harnessList.add(harnessName);
		testMap.set(harnessLine, harnessName);
		if (!unwindMap.has(harnessLine)) {
			unwindMap.set(harnessLine, unwindValue);
		}
		map.set(harnessLine, mapLineValue);
	}

	// Kani proofs
	for (const test of allProofs) {
		const [harnessLineRaw, mapLineValue]: [string, string] = getHarnessInformationFromTest(test);
		const unwindValue: number = extractUnwindValueFromLine(harnessLineRaw);
		let harnessLine: string = extractFunctionLine(harnessLineRaw);
		const harnessName: string = getHarnessNameFromHarnessLine(harnessLine);
		harnessLine = harnessLine.replace(/\s+/g, '');
		harnessList.add(harnessName);
		harnessMap.set(harnessLine, harnessName);
		if (!unwindMap.has(harnessLine)) {
			unwindMap.set(harnessLine, unwindValue);
		}
		map.set(harnessLine, mapLineValue);
	}

	const lines = text.split('\n');
	if (harnessList.size > 0) {
		for (let lineNo = 0; lineNo < lines.length; lineNo++) {
			// Get the current line from source and check if
			// the maps contain the line or not
			const line: string = lines[lineNo];
			let strippedLine: string = line.replace(/\s+/g, '');

			// Add the parsed node for the current line
			const harness = allAttributes.find((p) => p.endPosition.row === lineNo);
			if(harness) {
				assert.equal(harness.fullLine, line.trim());
				const name: string = harness.name;
				const unwind = harness.args.unwind_value;

				// Range should cover the entire harness
				const range = new vscode.Range(
					new vscode.Position(lineNo, 0),
					new vscode.Position(lineNo, line.length),
				);
			}

			for (const fnMod of functionModifiers) {
				if (strippedLine.startsWith(fnMod)) {
					strippedLine = strippedLine.replace(fnMod, '');
				}
			}
			if (harnessMap.has(strippedLine)) {
				const name: string = harnessMap.get(strippedLine)!;
				const unwind: number = unwindMap.get(strippedLine)!;
				// Range should cover the entire harness
				const range = new vscode.Range(
					new vscode.Position(lineNo, 0),
					new vscode.Position(lineNo, line.length),
				);
				// Pass the harness onto the test item
				if (testMap.has(strippedLine)) {
					// Check for potential flags passed under the annotations
					if (!isNaN(unwind)) {
						events.onTest(range, name, false, unwind);
					} else {
						events.onTest(range, name, false);
					}
				} else {
					if (!isNaN(unwind)) {
						events.onTest(range, name, true, unwind);
					} else {
						events.onTest(range, name, true);
					}
				}
				continue;
			}
		}
	}
};

/**
 * Given a bolero test case, extract the unwind integer value
 *
 * @param harnessLineRaw - unprocessed line from the source text
 * @returns - Unwind value as integer
 */
export function extractUnwindValueFromTest(harnessLineRaw: string): number {
	let unwindValue: number = NaN;
	const harnessLineSplit = harnessLineRaw.split('\n');
	if (searchKaniConfig(harnessLineSplit)) {
		unwindValue = extractUnwindValue(harnessLineSplit);
	} else {
		return NaN;
	}
	return unwindValue;
}

/**
 * Given any array of lines of code containing kani annotations, extract the integer corresponding
 * to the unwind value and return
 *
 * @param harnessLineSplit - Array of source lines that belong to the harness
 * @returns unwind value
 */
export function extractUnwindValue(harnessLineSplit: string[]): number {
	for (let x of harnessLineSplit) {
		x = x.trim();

		if (x.includes('kani::unwind(')) {
			const unwindValue: number = parseInt(x.match(/\d+/)![0]);
			return unwindValue;
		}
	}

	return NaN;
}

/**
 * Given any array of lines of code containing kani annotations, extract the integer corresponding
 * to the unwind value and return
 *
 * @param harnessLineSplit - Array of source lines that belong to the harness
 * @returns unwind value
 */
export function extractUnwindValueNew(harnessLine: string): number {

	if (harnessLine.includes('kani::unwind(')) {
		const unwindValue: number = parseInt(harnessLine.match(/\d+/)![0]);
		return unwindValue;
	}

	return NaN;
}

/**
 * Given any array of lines of code containing kani annotations, extract the integer corresponding
 * to the unwind value and return
 *
 * @param harnessLineSplit - Array of source lines that belong to the harness
 * @returns unwind value
 */
export function extractSolverValueNew(str: string): string {
	const prefix = '#[kani::solver("';
	const suffix = '")';
	const startIndex = str.indexOf(prefix);
	// if (startIndex === -1) {
	// 	return "";
	// }
	const endIndex = str.indexOf(suffix, startIndex + prefix.length);
	// if (endIndex === -1) {
	// 	return "";
	// }

	const value = str.slice(startIndex + prefix.length, endIndex-1);

	return value;
}

/**
 * Return unwind value given a string containing the bolero proof and it's matching harness case
 *
 * @param harnessLineRaw - Unprocessed source line
 * @returns - unwind value
 */
export function extractUnwindValueFromLine(harnessLineRaw: string): number {
	let unwindValue: number = NaN;
	let harnessLine = '';
	if (!harnessLineRaw.startsWith('fn')) {
		if (harnessLineRaw.charAt(0) === '\n') {
			harnessLine = harnessLineRaw.replace('\n', '').concat('{');
		}
	}
	const harnessLineSplit = harnessLine.split('\n');
	unwindValue = extractUnwindValue(harnessLineSplit);
	return unwindValue;
}

/**
 *  Given a source line, extract the function name from the bolero test case
 *
 * @param harnessLineRaw - unprocessed line from the source text
 * @returns - name of the function containing proof annotation
 */
export function extractFunctionLineFromTest(harnessLineRaw: string): string {
	let harnessLine: string = '';
	const harnessLineSplit = harnessLineRaw.split('\n');
	if (searchKaniConfig(harnessLineSplit)) {
		harnessLine = cleanFunctionLine(harnessLineSplit);
	} else {
		return '';
	}
	return harnessLine;
}

/**
 * Extract function name from the line
 *
 * @param harnessLineRaw - unprocessed line from the source text
 * @returns - function name
 */
export function extractFunctionLine(harnessLineRaw: string): string {
	let harnessLine: string = '';
	if (!harnessLineRaw.startsWith('fn')) {
		if (harnessLineRaw.charAt(0) === '\n') {
			harnessLine = harnessLineRaw.replace('\n', '').concat('{');
		}
	}
	const harnessLineSplit = harnessLine.split('\n');
	harnessLine = cleanFunctionLine(harnessLineSplit);
	return harnessLine;
}

/**
 * Clean out noise from the raw line and return the function name
 *
 * @param harnessLineSplit - Array of source lines that belong to the harness
 * @returns - function name
 */
export function cleanFunctionLine(harnessLineSplit: string[]): string {
	for (let x of harnessLineSplit) {
		x = x.trim();
		if (x.startsWith('fn')) {
			return x;
		}
		if (
			x.startsWith('pub') ||
			x.startsWith('async') ||
			x.startsWith('extern') ||
			x.startsWith('const') ||
			x.startsWith('unsafe')
		) {
			const functionNameSplit: string[] = x.split('fn');
			if (functionNameSplit.length >= 2) {
				const functionName: string = 'fn ' + functionNameSplit[1].trim();
				return functionName;
			} else {
				return '';
			}
		}
	}
	return harnessLineSplit.join('');
}

/**
 * Extract the harness name given the processed source line
 *
 * @param harnessLine - Post processed and cleaned source line
 * @returns - harness name
 */
export function getHarnessNameFromHarnessLine(harnessLine: string): string {
	const harnessLineSplit: string[] = harnessLine.split(' ');

	if (
		harnessLineSplit === undefined ||
		harnessLineSplit.length < 2 ||
		harnessLineSplit.at(1) === undefined
	) {
		return '';
	}

	const harnessNamePostFunction: string | undefined = harnessLineSplit.at(1);

	if (harnessNamePostFunction === undefined || harnessNamePostFunction.split('(').length === 0) {
		return '';
	}

	const harnessName: string | undefined = harnessNamePostFunction.split('(').at(0);
	if (harnessName === undefined) {
		return '';
	}
	return harnessName;
}

/**
 * util function to return matched regex patterns
 *
 * @param test - Match Array from RegEx
 * @returns Tuple from unprocessed line that matches regex and corresponding harness
 */
export function getHarnessInformationFromTest(test: RegExpMatchArray): [string, string] {
	if (!test || test.length < 2) {
		throw new Error('Regex Match incorrect');
	}
	const harnessLineRaw: string = test.at(1) as string;
	const mapLineValue: string = test.at(0) as string;

	return [harnessLineRaw, mapLineValue];
}

// Util function to search for kani annotation as a substring in the array of regex matches
function searchKaniConfig(harnessLineSplit: string[]): boolean {
	for (const line of harnessLineSplit) {
		if (line.includes(kaniConfig)) {
			return true;
		}
	}
	return false;
}
