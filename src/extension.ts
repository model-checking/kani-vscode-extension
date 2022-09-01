import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "Kani" is now active!');

	const runKani = vscode.commands.registerCommand('Kani.runKani', async () => {
		showInformationMessage('Kani.runKani');
	});
	const runcargoKani = vscode.commands.registerCommand('Kani.runcargoKani', async () => {
		//TODO: Always point to the root of the cargo crate (or source file) before running cargo kani
		showInformationMessage('Kani.runcargoKani');

	});

	context.subscriptions.push(runKani);
	context.subscriptions.push(runcargoKani);
	//TODO: Run cargo clean once done

}

async function showInformationMessage(message: string): Promise<void> {

	const command: string = message === "Kani.runcargoKani" ? "cargo kani" : "kani";

	const answer = await vscode.window.showInformationMessage(`Run ${command}?`, "yes", "no");
	if(answer === "yes"){
		console.log(`Running ${command}`);
		runCommand(command);
	}
	else{
		console.log(`Exiting ${command} extension`);
	}
}

function runCommand(command: string): void {
	let finalCommand = ``;

	// Detect source file
	const sourceFile = vscode.window.activeTextEditor?.document;
	const terminal = vscode.window.activeTerminal ?? vscode.window.createTerminal();

	// String template for the final command that runs in the terminal
	if(command === "kani") {
		finalCommand = `${command} ${sourceFile?.fileName}`;
	}
	else{
		finalCommand = `${command}`;
	}

	terminal.sendText(finalCommand);
	terminal.show();

}

// this method is called when your extension is deactivated
export function deactivate() {}
