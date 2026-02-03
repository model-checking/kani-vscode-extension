// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as path from 'path';

import { glob } from 'glob';
import Mocha from 'mocha';

export async function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd',
		color: true,
	});

	const testsRoot = path.resolve(__dirname, '..');

	// Find all test files using glob (now async in v13+)
	const files = await glob('**/**.test.js', { cwd: testsRoot });

	// Add files to the test suite
	files.forEach((f) => {
		mocha.addFile(path.resolve(testsRoot, f));
	});

	return new Promise((resolve, reject) => {
		try {
			// Run the mocha test
			mocha.run((failures) => {
				if (failures > 0) {
					reject(new Error(`${failures} tests failed.`));
				} else {
					resolve();
				}
			});
		} catch (err) {
			console.error(err);
			reject(err);
		}
	});
}
