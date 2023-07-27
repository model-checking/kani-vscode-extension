// // renderer.ts
// import CoverageConfig from './config';
// import { CoverageInfo } from './coverageInfo';
// import CoverageService from './coverageService';
// import * as vscode from 'vscode';

// // Takes care of the rendering logic and caches it
// class Renderer {
//     private cache: any;
//     private configStore: CoverageConfig;

//     constructor(configStore: CoverageConfig) {
//         this.configStore = configStore;
//         const coverageService = CoverageService.getInstance();
//         this.cache = coverageService.getCache();
//     }

//     renderHighlight(editor: vscode.TextEditor, coverage: CoverageInfo): void {
//         editor.setDecorations(this.configStore.covered, coverage.full);
//         editor.setDecorations(this.configStore.partialcovered, coverage.partial);
//         editor.setDecorations(this.configStore.uncovered, coverage.none);
//     }
// }

// export default Renderer;
