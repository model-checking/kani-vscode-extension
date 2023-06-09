# Kani Visual Studio Code Extension

A [Visual Studio Code](https://code.visualstudio.com/) extension that allows users to run and debug their [Kani Rust Verifier](https://github.com/model-checking/kani) harnesses in vscode.

## Usage

![Kani Usage](resources/screenshots/kani-demo.png)

1.  Open a Rust package in Visual Studio Code.
2.  Navigate to the testing panel and expand on the Kani harness tree view where the harnesses are shown.
3.  Click on the play button beside the harness or the filename or the crate to run Kani on the respective test case.

Check [user guide](docs/user-guide.md) for more detailed information.

## Features

-   Kani harness Tree view
-   Kani harness Runner
-   Counter Example unit test generator (Concrete Playback)
-   Harness debugger

## Requirements

-   [Visual Studio Code](https://code.visualstudio.com/) 1.50 or newer
-   [Kani](https://github.com/model-checking/kani) 0.29 or newer

## Extension Settings

| Setting                           | Description                                                                                                                                                                                        | Default                                                        |
| :-------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------- |
| `kani.enable-codelens` | Enable Codelens actions for `Run Test (Kani)` & `Debug Test (Kani)`.                                                                                                      | `true`                                                         |
| `kani.show-output-window`     | Toggle to show the output terminal window containing the full output from Kani.                                                                  | `false`                                                     |


## Installation

The Kani VSCode Extension is available as a VSCode plugin. You can install the [Kani VSCode Extension](https://marketplace.visualstudio.com/items?itemName=model-checking.kani-vscode-extension) from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/).

If you want to build and package from source directly, see [dev-documentation](docs/dev-documentation.md) for more information.

## Troubleshooting

1. If verification seems to be taking too much time, stop the verification using the stop button on the testing panel.
2. Some times if the output seems unexpected, it might because an old result is cached in. It helps to run `cargo clean` and re-running the harness.
3. If the screen seems frozen, or inactive, try reloading the vscode window.

## Security

See [SECURITY](.github/SECURITY.md) for more information.

## License

This code is distributed under the terms of both the MIT license and the Apache License (Version 2.0).
See [LICENSE-APACHE](LICENSE-APACHE) and [LICENSE-MIT](LICENSE-MIT) for details.

## Code of conduct

This project has adopted the [Rust Code Of Conduct](https://www.rust-lang.org/policies/code-of-conduct).
See [CODE OF CONDUCT](CODE_OF_CONDUCT.md) for details.
