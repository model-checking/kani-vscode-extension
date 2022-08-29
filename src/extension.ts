// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "Kani" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const runKani = vscode.commands.registerCommand('Kani.runKani', async () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user

		const answer = await vscode.window.showInformationMessage('Hello World from Kani!', "yes", "no");
		if(answer === "yes"){
			console.log("Running Kani");
			const kaniCommand: string = "kani";

			// Detect source file
			const sourceFile = vscode.window.activeTextEditor?.document;
			const terminal = vscode.window.activeTerminal ?? vscode.window.createTerminal();

			// String template for the final command that runs in the terminal
			let finalCommand = `${kaniCommand} ${sourceFile?.fileName}`;

			terminal.show();
			terminal.sendText(finalCommand);
		}
		else{
			console.log("not running kani");
		}

	});

	context.subscriptions.push(runKani);
}

// this method is called when your extension is deactivated
export function deactivate() {}
