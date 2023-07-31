// Copyright Kani Contributors
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { DecorationRenderOptions, ExtensionContext, TextEditorDecorationType, window } from "vscode";

// Takes the extension context and stores the specified decoration (VS Code highliging API) values for that context
// By storing the decoration values per context, we allow users to de-highlight the same contexts.
// Without caching these values as a global cache, VS Code does not de-highlight.
class CoverageConfig {
    public covered!: TextEditorDecorationType;
    public partialcovered!: TextEditorDecorationType;
    public uncovered!: TextEditorDecorationType;

    private context: ExtensionContext;

    constructor(context: ExtensionContext) {
        this.context = context;
        this.setup();
    }

    private setup(): void {
        const fullDecoration: DecorationRenderOptions = {
            backgroundColor: 'rgba(0, 255, 0, 0.2)', // Green background
            isWholeLine: false
        };

        const partialDecoration: DecorationRenderOptions = {
            backgroundColor: 'rgba(255, 255, 0, 0.2)', // Yellow background
            isWholeLine: false
        };

        const noDecoration: DecorationRenderOptions = {
            backgroundColor: 'rgba(255, 0, 0, 0.2)', // Red background
            isWholeLine: false
        };

        this.covered = window.createTextEditorDecorationType(fullDecoration);
        this.partialcovered = window.createTextEditorDecorationType(partialDecoration);
        this.uncovered = window.createTextEditorDecorationType(noDecoration);
    }
}

export default CoverageConfig;
