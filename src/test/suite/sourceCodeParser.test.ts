// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as assert from 'assert';

import { SourceCodeParser, loadParser } from '../../ui/sourceCodeParser';
import {
	kaniConcreteTestsMetaData,
	rustFileWithUnitTestsOnly,
} from '../test-programs/concretePlaybackTests';
import {
	allProofSamples,
	sortedHarnessMapForAllProofs,
	sortedMapForAllTests,
} from '../test-programs/proofsAndTests';
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

suite('Test source code parsing', () => {
	// Parse for kani::proof helper function
	test('Test if proofs exist in file', () => {
		void (async () => {
			assert.strictEqual(await SourceCodeParser.checkFileForProofs(fullProgramSource), true);
			assert.strictEqual(await SourceCodeParser.checkFileForProofs(rustFileWithoutProof), false);
		})();
	});

	test('Test if all kani harnesses are detected', () => {
		void (async () => {
			const parser = await loadParser();
			const tree = parser.parse(kaniProofs);
			assert.ok(tree, 'Parser should return a tree');
			assert.deepStrictEqual(
				SourceCodeParser.findHarnesses(tree.rootNode.namedChildren),
				findHarnessesResultKani,
			);
		})();
	});

	test('Test if all Bolero harnesses are detected', () => {
		void (async () => {
			const parser = await loadParser();
			const tree = parser.parse(boleroProofs);
			assert.ok(tree, 'Parser should return a tree');
			assert.deepStrictEqual(
				SourceCodeParser.searchParseTreeForFunctions(tree.rootNode),
				findHarnessesResultBolero,
			);
		})();
	});

	test('Test if all attributes are detected', () => {
		void (async () => {
			assert.deepStrictEqual(
				await SourceCodeParser.getAttributeFromRustFile(kaniProofsUnsupported),
				attributeMetadataUnsupported,
			);
		})();
	});

	test('Test if final metadata map is structured right', () => {
		void (async () => {
			assert.deepStrictEqual(
				await SourceCodeParser.getAttributeFromRustFile(fullProgramSource),
				harnessMetadata,
			);
		})();
	});

	test('Test if concrete playback unit tests are picked up and placed at the right location', () => {
		void (async () => {
			assert.deepStrictEqual(
				await SourceCodeParser.extractKaniTestMetadata(rustFileWithUnitTestsOnly),
				kaniConcreteTestsMetaData,
			);
		})();
	});
});

suite('Test Module Extraction and Full Path to Proof', () => {
	// Parse for modules and test that the metadata is as per expectations
	test('Test if modules are parsed as required from a file', () => {
		void (async () => {
			assert.deepStrictEqual(
				await SourceCodeParser.getAttributeFromRustFile(allProofSamples),
				sortedHarnessMapForAllProofs,
			);
		})();
	});

	// Parse for modules and test that the metadata is as per expectations for Bolero proofs
	test('Test if Bolero modules are parsed as required from a file', () => {
		void (async () => {
			assert.deepStrictEqual(
				await SourceCodeParser.getAttributeFromRustFile(boleroProofs),
				sortedMapForAllTests,
			);
		})();
	});
});
