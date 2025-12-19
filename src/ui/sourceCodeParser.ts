// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as assert from 'assert';
import path from 'path';

import * as vscode from 'vscode';
import { Language, Parser } from 'web-tree-sitter';

import { countOccurrences, getConcatenatedModuleName } from '../utils';
import { HarnessMetadata } from './sourceMap';

// Parse for kani::proof helper function
export async function loadParser(): Promise<Parser> {
	await Parser.init();
	const parser = new Parser();
	const lang = await Language.load(path.join(__dirname, '../..', 'tree-sitter-rust.wasm'));
	parser.setLanguage(lang);
	return parser;
}

export namespace SourceCodeParser {
	// Return True if proofs exist in the file, False if not
	export async function checkFileForProofs(content: string): Promise<boolean> {
		return checkTextForProofs(content);
	}

	// Match source text for Kani annotations
	export const checkTextForProofs = async (content: string): Promise<boolean> => {
		const parser = await loadParser();
		const tree = parser.parse(content);
		if (!tree) {
			return false;
		}
		return checkforKani(tree.rootNode);
	};

	// Use the tree sitter to get attributes
	export async function getAttributeFromRustFile(file: string): Promise<HarnessMetadata[]> {
		const parser = await loadParser();
		const tree = parser.parse(file);
		if (!tree) {
			return [];
		}
		const harnesses = searchParseTreeForFunctions(tree.rootNode);
		const harnessesMapped = addModuleToFunction(tree.rootNode, harnesses);
		const sortedHarnessByline = [...harnessesMapped].sort(
			(a, b) => a.endPosition.row - b.endPosition.row,
		);
		return sortedHarnessByline;
	}

	// Add module metadata to each of the harnesses from the reverse map
	export function addModuleToFunction(rootNode: any, harnesses: any): any {
		const modMap = findModulesForFunctions(rootNode);
		for (const harness of harnesses) {
			harness.module = modMap.get(harness.harnessName);
		}
		return harnesses;
	}

	// For each module, find the harnesses inside them and generate a reverse map
	// from harness to module path
	export function findModulesForFunctions(rootNode: any): Map<string, string> {
		const moduleDeclarationNodes: Map<string, string[]> = mapModulesToHarness(rootNode);
		const resultMap: Map<string, string> = getConcatenatedModuleName(moduleDeclarationNodes);
		return resultMap;
	}

	// For each module, find the harnesses inside them
	export function mapModulesToHarness(rootNode: any): Map<string, string[]> {
		const moduleDeclarationNodes = rootNode.descendantsOfType('mod_item');

		// Extract the functions from each module
		const mapFromModFunction = new Map<string, string[]>();
		for (const item of moduleDeclarationNodes) {
			// Extract the functions from each module
			const moduleName = item.namedChildren[0].text.trim();
			// Find all function declaration nodes within this module
			const functionDeclarationNodes = item.descendantsOfType('function_item');
			// Extract the function names
			const functionNames: string[] = functionDeclarationNodes.map(
				(functionDeclarationNode: any) => {
					return functionDeclarationNode.namedChildren
						.find((p: { type: string }) => p.type === 'identifier')
						.text.trim();
				},
			);
			mapFromModFunction.set(moduleName, functionNames);
		}

		return mapFromModFunction;
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
				let stub_bool: boolean = false;
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
							if (strList[j].text.includes('stub')) {
								stub_bool = true;
							}
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
							harnessName: functionName.text,
							fullLine: unprocessedLine,
							endPosition: functionName.endPosition,
							attributes: attributesMetadata,
							args: { proof: true, test: test_bool, stub: stub_bool },
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

	// Search for concrete playback generated unit tests and their related metadata
	export async function extractKaniTestMetadata(text: string): Promise<any[]> {
		const parser = await loadParser();
		const tree = parser.parse(text);
		if (!tree) {
			return [];
		}
		const rootNode = tree.rootNode;

		// Find the attribute by searching for its text
		const tests = findKaniTests(rootNode);
		const result: any[] = [];

		for (const function_item of tests) {
			if (function_item && function_item.namedChildren?.at(0)?.type === 'identifier') {
				const function_item_name = function_item.namedChildren?.at(0)?.text;

				if (function_item_name === undefined) {
					return [];
				}

				const line = function_item.startPosition;
				result.push([function_item_name, line]);
			}
		}

		return result;
	}

	// Find all concrete playback generated unit tests using tree walking
	export function findKaniTests(rootNode: any): any[] {
		// Find all attributes with `#[test]`, then filter those with the `concrete_playback` prefix
		const attributeNode = rootNode
			.descendantsOfType('attribute_item')
			.filter(
				(item: any) => item.text == '#[test]' && item.nextNamedSibling?.type == 'function_item',
			);
		const attributes = attributeNode.filter((item: any) =>
			item.nextNamedSibling?.text.includes('kani_concrete_playback'),
		);

		const kani_concrete_tests: any[] = [];

		for (const item of attributes) {
			const function_item = item.nextNamedSibling;
			if (function_item && function_item.namedChildren?.at(0)?.type === 'identifier') {
				kani_concrete_tests.push(function_item);
			}
		}

		return kani_concrete_tests;
	}

	/**
	 * Find kani proof and bolero proofs and extract metadata out of them from source text
	 *
	 * @param text - raw source text from a file
	 * @param events - events that trigger parsing and extracting the harness metadata
	 */
	export const parseRustfile = async (
		text: string,
		events: {
			onTest(
				range: vscode.Range,
				name: string,
				proofBoolean: boolean,
				stub?: boolean,
				moduleName?: string,
			): void;
		},
	): Promise<void> => {
		// Create harness metadata for the entire file
		const allHarnesses: HarnessMetadata[] = await getAttributeFromRustFile(text);
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

					const name: string = harness.harnessName;
					// Range should cover the entire harness
					const range = new vscode.Range(
						new vscode.Position(lineNo, 0),
						new vscode.Position(lineNo, line.length),
					);

					// Optional args
					const stub: boolean = harness.args.stub;
					const module_name: string = harness.module ?? '';

					// Check if it's a proof (true) or a bolero case (false)
					const proofBoolean = !harness.args.test;
					events.onTest(range, name, proofBoolean, stub, module_name);
				}
			}
		}
	};
}
