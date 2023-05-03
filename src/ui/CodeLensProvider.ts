/* eslint-disable no-null/no-null */
import * as vscode from 'vscode';

import { SourceCodeParser } from './sourceCodeParser';

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

	/**
	 * Extends the provideCodeLenses function provided by CodeLens and adds Kani generated unit tests to their lists
	 *
	 * @param document Takes in the current file and provides the codelens button
	 * @param _token
	 * @returns
	 */

	public provideCodeLenses(document: vscode.TextDocument, _token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {

		if (vscode.workspace.getConfiguration("codelens-sample").get("enableCodeLens", true)) {
			this.codeLenses = [];
			const text = document.getText();

			// Find the unit tests by searching for its text
			const kani_concrete_tests = SourceCodeParser.extractKaniTestMetadata(text);

			for (const item of kani_concrete_tests) {
				const function_item_name = item.at(0);
				const startPosition = item.at(1);

				if(function_item_name === undefined) {
					return [];
				}

				// This is the metadata that VSCode needs to place the codelens button
				const line = document.lineAt(startPosition.row);
				const indexOf = line.text.indexOf(function_item_name);
				const position = new vscode.Position(line.lineNumber, indexOf);
				const range = document.getWordRangeAtPosition(position, new RegExp(this.regex));

				const c1 = {
					title: "Run Test (Kani)",
					tooltip: "Run unit test generated by kani",
					command: "codelens-sample.codelensAction",
					arguments: [function_item_name]
				};

				if (range) {
					this.codeLenses.push(new vscode.CodeLens(range, c1));
				}
			}
			return this.codeLenses;
		}

		return [];
	}

	public resolveCodeLens(codeLens: vscode.CodeLens): vscode.ProviderResult<vscode.CodeLens> {
		return codeLens;
	}
}