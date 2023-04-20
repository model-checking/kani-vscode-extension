/* eslint-disable no-null/no-null */
import * as vscode from 'vscode';

import { extractFunctionName } from '../utils';

/**
 * CodelensProvider
 */
export class CodelensProvider implements vscode.CodeLensProvider {

	private codeLenses: vscode.CodeLens[] = [];
	private regex: RegExp;
	private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
	public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

	constructor() {
		this.regex = /kani_concrete_playback/g;

		vscode.workspace.onDidChangeConfiguration((_) => {
			this._onDidChangeCodeLenses.fire();
		});
	}

	public provideCodeLenses(document: vscode.TextDocument, _token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {

		if (vscode.workspace.getConfiguration("codelens-sample").get("enableCodeLens", true)) {
			this.codeLenses = [];
			const regex = new RegExp(this.regex);
			const text = document.getText();
			let matches;
			while ((matches = regex.exec(text)) !== null) {
				const line = document.lineAt(document.positionAt(matches.index).line);
				const indexOf = line.text.indexOf(matches[0]);
				const position = new vscode.Position(line.lineNumber, indexOf);
				const range = document.getWordRangeAtPosition(position, new RegExp(this.regex));


				const functionName = extractFunctionName(line.text);

				// cargo test --package test-concrete --bin test-concrete -- kani_concrete_playback_check_estimate_size_14615086421508420155 --exact --nocapture

				const c1 = {
					title: "Run Kani Generated Test",
					tooltip: "Tooltip provided by sample extension",
					command: "codelens-sample.codelensAction",
					arguments: [functionName]
				};

				const c2 = {
					title: "Debug Kani Generated Test",
					tooltip: "Tooltip provided by sample extension",
					command: "codelens-sample.codelensAction",
					arguments: [functionName]
				};


				if (range) {
					this.codeLenses.push(new vscode.CodeLens(range, c1));
					this.codeLenses.push(new vscode.CodeLens(range, c2));
				}
			}
			return this.codeLenses;
		}
		return [];
	}
}
