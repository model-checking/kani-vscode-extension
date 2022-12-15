// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as vscode from 'vscode';

/**
 * Place all the items in a collection and convert them into an array of items
 * TODO: Experiment with presenting the collection as itself
 *
 * @param collection - Collection of test items from the entire crate
 * @returns - Array of test items
 */
export function gatherTestItems(collection: vscode.TestItemCollection) {
	const items: vscode.TestItem[] = [];
	collection.forEach((item) => items.push(item));
	return items;
}
