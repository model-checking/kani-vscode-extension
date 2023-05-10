// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as assert from 'assert';

import Parser from 'tree-sitter';

import { SourceCodeParser } from '../../ui/sourceCodeParser';
import {
	attributeMetadataUnsupported,
	boleroProofs,
	findHarnessesResultBolero,
	findHarnessesResultKani,
	fullProgramSource,
	harnessMetadata,
	kaniProofs,
	kaniProofsUnsupported,
	rustFileWithoutProof,
} from '../test-programs/sampleRustString';

const listofHarnesses: Set<string> = new Set<string>([
	'insert_test',
	'insert_test_2',
	'random_name',
	'function_abc',
	'function_xyz',
]);

suite('Verification symbol view', () => {
	// Parse for kani::proof helper function
	const Rust = require('tree-sitter-rust');
	const parser = new Parser();
	parser.setLanguage(Rust);

	test('Test if proofs exist in file', async () => {
		assert.strictEqual(await SourceCodeParser.checkFileForProofs(fullProgramSource), true);
		assert.strictEqual(await SourceCodeParser.checkFileForProofs(rustFileWithoutProof), false);
	});

	test('Test if all kani harnesses are detected', () => {
		const tree = parser.parse(kaniProofs);
		assert.deepStrictEqual(
			SourceCodeParser.findHarnesses(tree.rootNode.namedChildren),
			findHarnessesResultKani,
		);
	});

	test('Test if all Bolero harnesses are detected', () => {
		const tree = parser.parse(boleroProofs);
		assert.deepStrictEqual(
			SourceCodeParser.searchParseTreeForFunctions(tree.rootNode),
			findHarnessesResultBolero,
		);
	});

	test('Test if all attributes are detected', async () => {
		assert.deepStrictEqual(
			await SourceCodeParser.getAttributeFromRustFile(kaniProofsUnsupported),
			attributeMetadataUnsupported,
		);
	});

	test('Test if final metadata map is structured right', async () => {
		assert.deepStrictEqual(
			await SourceCodeParser.getAttributeFromRustFile(fullProgramSource),
			harnessMetadata,
		);
	});
});
