// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as assert from 'assert';

import Parser from 'tree-sitter';
import * as vscode from 'vscode';

import { countOccurrences } from '../utils';
import { HarnessMetadata } from './sourceMap';

// Parse for kani::proof helper function
const Rust = require('tree-sitter-rust');
const parser = new Parser();
parser.setLanguage(Rust);

export namespace SourceCodeParser {
	// Return True if proofs exist in the file, False if not
	export function checkFileForProofs(content: string): boolean {
		return checkTextForProofs(content);
	}

	// Match source text for Kani annotations
	export const checkTextForProofs = (content: string): boolean => {
		const tree = parser.parse(content);
		return checkforKani(tree.rootNode);
	};

	// Use the tree sitter to get attributes
	export function getAttributeFromRustFile(file: string): HarnessMetadata[] {
		const tree = parser.parse(file);
		const harnesses = searchParseTreeForFunctions(tree.rootNode);
		const sortedHarnessByline = [...harnesses].sort(
			(a, b) => a.endPosition.row - b.endPosition.row,
		);
		return sortedHarnessByline;
	}

	// Do DFS to get all harnesses
	export function searchParseTreeForFunctions(node: any): HarnessMetadata[] {
		const results: any[] = [];
		if (!node.namedChildren) {
			return results;
		}
		const harness_results = findHarnesses(node.namedChildren);
		if (harness_results.length > 0) {
			results.push(...harness_results);
		}
		for (let i = 0; i < node.namedChildren.length; i++) {
			if (node.namedChildren[i].namedChildren) {
				const result = searchParseTreeForFunctions(node.namedChildren[i]);
				if (result.length != 0) {
					results.push(...result);
				}
			}
		}
		return results;
	}

	// Given a list of nodes, return the function subnodes as a list of harness metadata objects
	export function findHarnesses(strList: any[]): HarnessMetadata[] {
		const resultMap: HarnessMetadata[] = [];
		for (let i = 0; i < strList.length; i++) {
			if (strList[i].type == 'attribute_item' && strList[i].text.includes('kani::proof')) {
				// Capture also, items that might be related to kani i.e other attributes in the same line or different lines
				// they will contain the words kani
				const attributes: any[] = [];
				const attributesMetadata: any[] = [];
				let test_bool: boolean = false;
				for (let j = i; j < strList.length; j++) {
					if (strList[j].type == 'attribute_item' && strList[j].text.includes('kani')) {
						// Check if test is above and if its in the form of cfg_attr()
						if (j >= 1 && strList[j - 1].type == 'attribute_item') {
							test_bool = strList[j - 1].text.includes('test');
						}

						// Get all attributes for the proof
						if (strList[j].text != '#[kani::proof]') {
							attributes.push(strList[j]);
							attributesMetadata.push(strList[j].text);
						}
					}

					// Proceed to the attached function, and create the harness
					// todo: assert that attributes and function are siblings to each other or not
					if (strList[j].type == 'function_item') {
						const functionName = strList[j].namedChildren.find(
							(p: { type: string }) => p.type === 'identifier',
						);
						const unprocessedLine = strList[j].text.split('\n')[0];
						const current_harness: HarnessMetadata = {
							name: functionName.text,
							fullLine: unprocessedLine,
							endPosition: functionName.endPosition,
							attributes: attributesMetadata,
							args: { proof: true, test: test_bool },
						};
						resultMap.push(current_harness);
						break;
					}
				}
			}
		}
		return resultMap;
	}

	// Search if there exists a kani attribute
	export function checkforKani(node: any): boolean {
		// check for the kani::proof attribute
		if (node.type === 'attribute_item' && countOccurrences(node.text, 'kani::proof') == 1) {
			return true;
		} else if (node.namedChildren) {
			for (let i = 0; i < node.namedChildren.length; i++) {
				if (checkforKani(node.namedChildren[i])) {
					return true;
				} else {
					continue;
				}
			}
		}
		return false;
	}

	/**
	 * Find kani proof and bolero proofs and extract metadata out of them from source text
	 *
	 * @param text - raw source text from a file
	 * @param events - events that trigger parsing and extracting the harness metadata
	 */
	export const parseRustfile = (
		text: string,
		events: {
			onTest(range: vscode.Range, name: string, proofBoolean: boolean, harnessArgs?: number): void;
		},
	): void => {
		// Create harness metadata for the entire file
		const allHarnesses: HarnessMetadata[] = getAttributeFromRustFile(text);
		console.log(JSON.stringify(allHarnesses, undefined, 2));
		const lines = text.split('\n');
		if (allHarnesses.length > 0) {
			for (let lineNo = 0; lineNo < lines.length; lineNo++) {
				// Get the current line from source and check if
				// the maps contain the line or not
				const line: string = lines[lineNo];

				// Add the parsed node for the current line
				const harness = allHarnesses.find((p) => p.endPosition.row === lineNo);
				if (harness) {
					assert.equal(harness.fullLine, line.trim());

					const name: string = harness.name;
					// Range should cover the entire harness
					const range = new vscode.Range(
						new vscode.Position(lineNo, 0),
						new vscode.Position(lineNo, line.length),
					);

					// Check if it's a proof (true) or a bolero case (false)
					const proofBoolean = !harness.args.test;
					events.onTest(range, name, proofBoolean);
				}
			}
		}
	};
}
