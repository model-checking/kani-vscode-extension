# Kani Visual Studio Code Extension

A Visual Studio Code test extension that allows users to run their [Kani Rust Verifier](https://github.com/model-checking/kani) proofs and view traces natively in vscode.

## Usage

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
-   [Kani](https://github.com/model-checking/kani) 0.12 or newer

## Installation

This extension is still in beta and has not yet been published on the marketplace. If you wish to use it now, you can [download the binary](https://github.com/model-checking/kani-vscode-extension) and install it manually.

### Install through the Binary

1.  If you have not already done so, [Install kani](https://github.com/model-checking/kani#installation).
1.  If you have not already done so, [install VSCode](https://code.visualstudio.com/download).
1.  Download the Kani extension binary [from our release page](https://github.com/model-checking/kani-vscode-extension/releases/).
1.  In VSCode, open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac) and type ext install
1.  Select the `Extensions: Install from VSIX...` command.
1.  In the file dialog that opens, navigate to the location where you downloaded the `.vsix` file and select it.
1.  The extension should be installed and you should see a message in the VS Code output pane saying that the extension was installed successfully.


![Kani install vsix](resources/screenshots/install-kani-extension.png)


If you want to build and package from source directly, see [dev-documentation](docs/dev-documentation.md) for more information.

## Troubleshooting

### Stuck at *Verifying...*

There is a known [issue](https://github.com/model-checking/kani-vscode-extension/issues/6) where the extension appears to get stuck if the stack size is too small.
If you experience this issue, you can increase the stack size or stop the verification. We are working to removing the need to increase the stack size.

Here is the workaround for the issue,
The user can set the environment variable `COMPlus_DefaultStackSize` to a sufficiently large value before starting VSCode. For example:

```sh
# Increase the stack size
export COMPlus_DefaultStackSize=100000
# Launch VSCode
code
```

OR

stop the verification using the stop button on the testing panel.

## Security

See [SECURITY](.github/SECURITY.md) for more information.

## License

This code is distributed under the terms of both the MIT license and the Apache License (Version 2.0).
See [LICENSE-APACHE](LICENSE-APACHE) and [LICENSE-MIT](LICENSE-MIT) for details.

## Code of conduct

This project has adopted the [Rust Code Of Conduct](https://www.rust-lang.org/policies/code-of-conduct).
See [CODE OF CONDUCT](CODE_OF_CONDUCT.md) for details.
