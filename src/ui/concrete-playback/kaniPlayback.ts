// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT
import * as vscode from 'vscode';

import GlobalConfig from '../../globalConfig';
import { getPackageName, getRootDir, isLibraryProject } from '../../utils';

/**
 * Runs the cargo test task whenever the user clicks on a codelens button
 * @param functionName - Name of the unit test being run by the user
 */
export async function runKaniPlayback(functionName: string): Promise<void> {
	const taskName = `Kani Playback: ${functionName}`;

	const packageName = await getPackageName(getRootDir());
	const taskDefinition: vscode.TaskDefinition = {
		type: 'cargo',
		command: 'test',
		args: [functionName],
	};

	const globalConfig = GlobalConfig.getInstance();
	const kaniBinaryPath = globalConfig.getFilePath();

	let playbackCommand: string = `${kaniBinaryPath} playback --package ${packageName} -Z concrete-playback`;

	const isLib: boolean = await isLibraryProject(getRootDir());
	if (isLib) {
		playbackCommand += ` --lib`;
	}

	playbackCommand += ` -- ${functionName} --nocapture`;

	const task = new vscode.Task(
		taskDefinition,
		vscode.TaskScope.Workspace,
		taskName,
		'cargo',
		new vscode.ShellExecution(playbackCommand),
	);
	vscode.tasks.executeTask(task);
}
