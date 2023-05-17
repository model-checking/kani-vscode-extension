// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as vscode from 'vscode';

/**
 * Runs the cargo test task whenver the user clicks on a codelens button
 * @param functionName - Name of the unit test being run by the user
 */
export function runCargoTest(
	functionName: string,
	moduleName: string,
	fileName: string,
	packageName: any,
): void {
	const taskName = `Cargo Test: ${functionName}`;
	let functionParameter: string;

	const taskDefinition: vscode.TaskDefinition = {
		type: 'cargo',
		command: 'test',
		args: [functionName],
	};

	if (fileName === 'main') {
		if (moduleName !== '') {
			functionParameter = `${moduleName}::${functionName}`;
		} else {
			functionParameter = functionName;
		}
	} else if (fileName != '') {
		if (moduleName === '') {
			functionParameter = `${fileName}::${functionName}`;
		} else {
			functionParameter = `${fileName}::${moduleName}::${functionName}`;
		}
	} else {
		// throw error?
		functionParameter = functionName;
	}

	const cargoTestCommand: string = `RUSTFLAGS="--cfg=kani" cargo test --package ${packageName} --bin ${packageName} -- ${functionParameter} --exact --nocapture`;
	const task = new vscode.Task(
		taskDefinition,
		vscode.TaskScope.Workspace,
		taskName,
		'cargo',
		new vscode.ShellExecution(cargoTestCommand),
	);
	vscode.tasks.executeTask(task);
}
