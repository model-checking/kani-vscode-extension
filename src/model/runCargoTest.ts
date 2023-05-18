// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as vscode from 'vscode';

import { getPackageName } from '../utils';

/**
 * Runs the cargo test task whenever the user clicks on a codelens button
 * @param functionName - Name of the unit test being run by the user
 */
export async function runCargoTest(functionName: string): Promise<void> {
	const taskName = `Cargo Test: ${functionName}`;

	const packageName = await getPackageName();
	const taskDefinition: vscode.TaskDefinition = {
		type: 'cargo',
		command: 'test',
		args: [functionName],
	};

	// Adding `--bin {packageName}` to the command prevents recompiling when
	// there's no changes to the unit tests, which makes rerunning unit tests faster.
	const cargoTestCommand: string = `RUSTFLAGS="--cfg=kani" cargo test --package ${packageName} --bin ${packageName} -- ${functionName} --nocapture`;
	const task = new vscode.Task(
		taskDefinition,
		vscode.TaskScope.Workspace,
		taskName,
		'cargo',
		new vscode.ShellExecution(cargoTestCommand),
	);
	vscode.tasks.executeTask(task);
}
