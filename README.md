# Kani Visual Studio Code Extension

A Visual Studio Code test extension that allows users to run their [Kani Rust Verifier](https://github.com/model-checking/kani) proofs and view traces natively in vscode.

Note - This extension is still in beta and has not yet been published on the Visual Studio Code Marketplace.  If you wish to use the extension now, you can [download the binary from our release page](https://github.com/model-checking/kani-vscode-extension/releases/) and install it manually.

## Usage

Here's how the kani extension looks like -

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

We expect this proof debugger to be released as an extension in the
[Visual Studio Code Marketplace](https://marketplace.visualstudio.com/VSCode).
At that point, users will install the debugger just like any other extension
in the marketplace from within Code itself.  For now, follow these
instructions for manual installation.

### Install through Binary

Download the Kani extension binary from the github page.

You can install an extension from the `.vsix` file opening the `.vsix` file directly from the file explorer as shown in the image below.

![Kani install vsix](resources/screenshots/install-kani-extension.png)

Alternatiely,

1.  In VSCode, open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac) and type ext install
2.  Select the `Extensions: Install from VSIX...` command.
3.  In the file dialog that opens, navigate to the locatioon where you downloaded the `.vsix` file and select it.
4.  The extension should be installed and you should see a message in the VS Code output pane saying that the extension was installed succesfully.

You can then enable the extension by going to the extension page on the `Extensions` view in VSCode and and clicking on the `enable` button.

If you want to build from source directly, see [dev-documentation](docs/dev-documentation.md) for more information.


### Packaging

To create a VSIX package of the previously built sources, create the package through the CLI:

```sh
npx vsce package
```

## Troubleshooting

### Stuck at *Verifying...*

There is a known [issue](https://github.com/model-checking/kani-vscode-extension/issues/6) where the extension appears to get stuck if the stack size is too small.
If you experience this issue, you can increase the stack size or stop the verification. We are working to removing the need to increase the stack size.


## Security

See [SECURITY](.github/SECURITY.md) for more information.

## License

This code is distributed under the terms of both the MIT license and the Apache License (Version 2.0).
See [LICENSE-APACHE](LICENSE-APACHE) and [LICENSE-MIT](LICENSE-MIT) for details.
