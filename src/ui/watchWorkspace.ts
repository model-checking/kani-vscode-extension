import * as vscode from 'vscode';
import {
	getWorkspaceTestPatterns,
	findInitialFiles,
	getOrCreateFile,
} from '../test-tree/createTests';

// Function to re-create test tree and new test cases upon triggering events
export function startWatchingWorkspace(
	controller: vscode.TestController,
	treeRoot?: vscode.TestItem,
) {
	const watcher = getWorkspaceTestPatterns().map(({ workspaceFolder, pattern }) => {
		const watcher = vscode.workspace.createFileSystemWatcher(pattern);

		watcher.onDidCreate((uri) => getOrCreateFile(controller, uri));
		watcher.onDidChange((uri) => {
			const { file, data } = getOrCreateFile(controller, uri);
			if (data.didResolve) {
				data.updateFromDisk(controller, file);
			}
		});
		watcher.onDidDelete((uri) => controller.items.delete(uri.toString()));

		findInitialFiles(controller, pattern, treeRoot);

		return watcher;
	});
	return watcher;
}
