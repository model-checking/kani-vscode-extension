// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as vscode from 'vscode';

import { runCommandPure } from '../model/kaniCommandCreate';

/**
 * Show message to user about running kani or cargo kani as a command on the crate
 *
 * @param message - VSCode command to be run
 */
export async function showInformationMessage(message: string): Promise<void> {
	const command: string = message === 'Kani.runcargoKani' ? 'cargo kani' : 'kani';

	const answer = await vscode.window.showInformationMessage(`Run ${command}?`, 'yes', 'no');
	if (answer === 'yes') {
		runCommandPure(command);
	} else {
		console.log(`Exiting ${command} extension`);
	}
}
