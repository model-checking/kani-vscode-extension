import * as toml from 'toml';
import * as vscode from 'vscode';

import { getRootDir } from '../utils';

export async function getPackageName(): Promise<any> {
    const dirName = getRootDir();
    const cargoTomlUri = vscode.Uri.file(`${dirName}/Cargo.toml`);

    try {
        const buffer = await vscode.workspace.fs.readFile(cargoTomlUri);
        const cargoToml = buffer.toString();
        const cargoTomlObject = toml.parse(cargoToml);
        return cargoTomlObject.package?.name;
    } catch (error) {
        console.error(error);
        return undefined;
    }
}

export async function runCodeLensTest(functionName: string): Promise<void> {
    const taskName = `Cargo Test: ${functionName}`;

    const packageName = await getPackageName();
    const taskDefinition: vscode.TaskDefinition = { type: 'cargo', command: 'test', args: [functionName] };
    const cargoTestCommand: string = `RUSTFLAGS="--cfg=kani" cargo test --package ${packageName} --bin ${packageName} -- ${functionName} --exact --nocapture`;
    const task = new vscode.Task(taskDefinition, vscode.TaskScope.Workspace, taskName, 'cargo', new vscode.ShellExecution(cargoTestCommand));
    vscode.tasks.executeTask(task);
}
