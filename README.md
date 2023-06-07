# Kani Visual Studio Code Extension

A Visual Studio Code test extension that allows users to run their [Kani Rust Verifier](https://github.com/model-checking/kani) proofs and view traces natively in vscode.

## Usage

Check [user guide](docs/user-guide.md) for more detailed information.

![Kani Usage](resources/screenshots/kani-demo.png)

1.  Open a rust crate or workspace in Visual Studio Code
2.  Navigate to the testing panel and expand on the Kani Proofs tree where the proofs are stored
3.  Click on the play button beside the harness or the filename or the crate to run Kani on the respective test case.

## Features

-   Run proofs natively the same way you run your test
-   View verification result and failed properties
-   View counter example report for failed proofs

## Requirements

-   Visual Studio Code 1.50 or newer
-   [Kani](https://github.com/model-checking/kani) 0.29 or newer

## Installation

Kani Extension is available as a VSCode plugin. You can install [Kani Extension](https://marketplace.visualstudio.com/items?itemName=model-checking.kani-vscode-extension) from the Visual Studio Marketplace or the Open VSX Registry.

If you want to build and package from source directly, see [dev-documentation](docs/dev-documentation.md) for more information.

## Troubleshooting

1. If verification seems to be taking too much time, stop the verification using the stop button on the testing panel.

## Security

See [SECURITY](.github/SECURITY.md) for more information.

## License

This code is distributed under the terms of both the MIT license and the Apache License (Version 2.0).
See [LICENSE-APACHE](LICENSE-APACHE) and [LICENSE-MIT](LICENSE-MIT) for details.

## Code of conduct

This project has adopted the [Rust Code Of Conduct](https://www.rust-lang.org/policies/code-of-conduct).
See [CODE OF CONDUCT](CODE_OF_CONDUCT.md) for details.
