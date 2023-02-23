// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import { TestItem, TestItemCollection } from 'vscode';

/**
 * Place all the items in a collection and convert them into an array of items
 *
 * @param collection - Collection of test items from the entire crate
 * @returns - Array of test items
 */
export function gatherTestItems(collection: TestItemCollection): TestItem[] {
	const items: TestItem[] = [];
	collection.forEach((item) => items.push(item));
	return items;
}
