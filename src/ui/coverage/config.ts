import { DecorationRenderOptions, ExtensionContext, TextEditorDecorationType, window } from "vscode";

class CoverageConfig {
    public covered!: TextEditorDecorationType;
    public partialcovered!: TextEditorDecorationType;
    public uncovered!: TextEditorDecorationType;

    private context: ExtensionContext;

    constructor(context: ExtensionContext) {
        this.context = context;
        this.setup();

    }

    private setup() {
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
