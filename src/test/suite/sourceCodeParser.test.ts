// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as assert from 'assert';

import { checkFileForProofs } from '../../ui/sourceCodeParser';
import { programWithProof, rustFileWithoutProof } from '../test-programs/sampleRustString';
import { getHarnessListFromParsing, getUnwindMapFromParsing } from '../test-programs/stubbedParser';

const listofHarnesses: Set<string> = new Set<string>([
	'insert_test',
	'insert_test_2',
	'random_name',
	'function_abc',
	'function_xyz',
]);
const listofHarnesses2: Set<string> = new Set<string>(['']);

const UnwindMap1: Map<string, number> = new Map([['{', NaN]]);
const UnwindMap2: Map<string, number> = new Map([
	['fnfunction_abc(){', 0],
	['fnfunction_xyz(){', NaN],
	['fninsert_test(){', 0],
	['fninsert_test_2(){', 1],
	['fnrandom_name(){', 1],
]);

suite('Verification symbol view', () => {
	test('Test if proofs exist in file', () => {
		assert.strictEqual(checkFileForProofs(programWithProof), true);
		assert.strictEqual(checkFileForProofs(rustFileWithoutProof), false);
	});

	test('Test if all harnesses are detected', () => {
		assert.deepEqual(getHarnessListFromParsing(rustFileWithoutProof), listofHarnesses2);
		assert.deepEqual(getHarnessListFromParsing(programWithProof), listofHarnesses);
	});

	test('Test if unwind values are detected', () => {
		assert.deepEqual(getUnwindMapFromParsing(rustFileWithoutProof), UnwindMap1);
		assert.deepEqual(getUnwindMapFromParsing(programWithProof), UnwindMap2);
	});
});
