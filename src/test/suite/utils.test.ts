// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as assert from 'assert';

import { getConcatenatedModuleName } from '../../utils';

suite('Test Utility functions', () => {
	suite('Test getConcatenatedModuleName', () => {
		test('should return a map with keys grouped by the same value', () => {
			const map = new Map<string, string[]>();
			map.set('key1', ['value1']);
			map.set('key2', ['value2']);
			map.set('key3', ['value1']);

			const result = getConcatenatedModuleName(map);

			assert.strictEqual(result.size, 2);
			assert.strictEqual(result.get('value1'), 'key1::key3');
			assert.strictEqual(result.get('value2'), 'key2');
		});

		test('should handle multiple values with the same key', () => {
			const map = new Map<string, string[]>();
			map.set('key1', ['value1', 'value2']);
			map.set('key2', ['value3']);
			map.set('key3', ['value2']);

			const result = getConcatenatedModuleName(map);

			assert.strictEqual(result.size, 3);
			assert.strictEqual(result.get('value1'), 'key1');
			assert.strictEqual(result.get('value3'), 'key2');
			assert.strictEqual(result.get('value2'), 'key1::key3');
		});

		test('should handle single values with different keys', () => {
			const map = new Map<string, string[]>();
			map.set('key1', ['value1']);
			map.set('key2', ['value2']);
			map.set('key3', ['value3']);

			const result = getConcatenatedModuleName(map);

			assert.strictEqual(result.size, 3);
			assert.strictEqual(result.get('value1'), 'key1');
			assert.strictEqual(result.get('value2'), 'key2');
			assert.strictEqual(result.get('value3'), 'key3');
		});
	});
});
