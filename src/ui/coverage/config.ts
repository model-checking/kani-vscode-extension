import { DecorationRenderOptions, ExtensionContext, TextEditorDecorationType, window } from "vscode";

class Config {
    public covered!: TextEditorDecorationType;
    public uncovered!: TextEditorDecorationType;

    private context: ExtensionContext;

    constructor(context: ExtensionContext) {
        this.context = context;
        this.setup();

    }

    private setup() {
        const fullDecoration: DecorationRenderOptions = {
            backgroundColor: 'rgba(0, 255, 0, 0.3)', // Green background
            isWholeLine: false
        };

        const noDecoration: DecorationRenderOptions = {
            backgroundColor: 'rgba(255, 0, 0, 0.3)', // Red background
            isWholeLine: false
        };

        this.covered = window.createTextEditorDecorationType(fullDecoration);
        this.uncovered = window.createTextEditorDecorationType(noDecoration);
    }
}

export default Config;
