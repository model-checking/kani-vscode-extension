# Kani Visual Studio Code Extension

A [Visual Studio Code](https://code.visualstudio.com/) extension that allows users to run and debug their [Kani Rust Verifier](https://github.com/model-checking/kani) harnesses in VS Code.

## Usage

![Kani Usage](kani-demo.png)

1.  Open a Rust package in Visual Studio Code.
2.  Navigate to the testing panel and expand on the Kani harness tree view where the harnesses are shown.
3.  Click on the play button beside the harness or the filename or the crate to run Kani on the respective test case.

Check [user guide](docs/user-guide.md) for more detailed information.

## Features

-   Automatically indexes and shows Kani harnesses in a tree view.
-   One-click button for verifying Kani harnesses.
-   Generate counterexamples as Rust unit tests.
-   Debug counterexamples using a standard debugger.
-   View coverage information inline using VS Code source highlighting.

## Requirements

-   [Visual Studio Code](https://code.visualstudio.com/) 1.50 or newer
-   [Kani](https://github.com/model-checking/kani) 0.34 or newer

NOTE: The extension only works on Cargo packages. For standalone Rust files, Kani is only available on the command line.

## Extension Settings

| Setting                           | Description                                                                                                                                                                                        | Default                                                        |
| :-------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------- |
| `kani.enable-codelens` | Enable Codelens actions for `Run Test (Kani)` & `Debug Test (Kani)`.                                                                                                      | `true`                                                         |
| `kani.show-output-window`     | Toggle to show the output terminal window containing the full output from Kani.                                                                  | `false`                                                     |
| `kani.highlight-coverage` | Toggle to enable the codelens button for `Generage Coverage` by default.  | `false`

## Installation

The Kani VSCode Extension is available as a VSCode plugin. You can install the [Kani VSCode Extension](https://marketplace.visualstudio.com/items?itemName=model-checking.kani-vscode-extension) from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/).

If you want to build and package from source directly, see [dev-documentation](docs/dev-documentation.md) for more information.

## Troubleshooting

Check [troubleshooting](docs/troubleshooting.md) for frequently asked questions and potential fixes.

If you have a question that is not answered there, please file an [issue](https://github.com/model-checking/kani-vscode-extension/issues/new/choose) with your question.


## Security

See [SECURITY](.github/SECURITY.md) for more information.

## License

This code is distributed under the terms of both the MIT license and the Apache License (Version 2.0).
See [LICENSE-APACHE](LICENSE-APACHE) and [LICENSE-MIT](LICENSE-MIT) for details.

## Code of conduct

This project has adopted the [Rust Code Of Conduct](https://www.rust-lang.org/policies/code-of-conduct).
See [CODE OF CONDUCT](CODE_OF_CONDUCT.md) for details.
