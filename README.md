# Kani Visual Studio Code Extension

A Visual Studio Code test extension that allows users to run their [Kani Rust Verifier](https://github.com/model-checking/kani) proofs and view traces natively in vscode.

## Features

-   Run proofs natively just like any other test
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

1.  Download the Kani extension binary from the github page.
2.  In VSCode, open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac) and type ext install
3.  Select the `Extensions: Install from VSIX...` command.
4.  In the file dialog that opens, navigate to the locatioon where you downloaded the `.vsix` file and select it.
5.  The extension should be installed and you should see a message in the VS Code output pane saying that the extension was installed succesfully.

Alternatively, you can install an extension from a `.vsix` file opening the `.vsix` file directly from the file explorer.

You can then enable the extension by going to the extension page on the `Extensions` view in VSCode and and clicking on the `enable` button.


### Manual Installation

On MacOS, use the [homebrew](https://brew.sh/) package manager to install with

```
brew install node
git clone https://github.com/model-checking/kani-vscode-extension kani-extension
cd kani-extension
npm install
make
make install
```

The [homebrew](https://brew.sh/) page gives instructions for
installing `brew`.
The command `brew install node` installs the [Node.js](https://nodejs.org)
runtime for [JavaScript](https://en.wikipedia.org/wiki/JavaScript),
including the [npm](https://docs.npmjs.com/about-npm) package manager.
The command `npm install` installs the dependencies listed in
packages.json into the directory `node_modules`.
The command `make` builds the extension into a file
named `kani-extension-VERSION.vsix` where `VERSION` is the version number
given in package.json.
The command `make install` runs `code` from the command line to
install the extension in Code.

On other platforms, you can download a Node.js installer for your platform
from the [Node.js download page](https://nodejs.org/en/download),
and the remaining instructions should work.
On Ubuntu, you can install Node.js with just `apt install nodejs`.

### Packaging

To create a VSIX package of the previously built sources, create the package through the CLI:

```sh
npx vsce package
```

### Coding Conventions

We use ESLint with the TypeScript plugin to ensure code consistency across the whole source. Install the [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) extension in VSCode to have live feedback. Alternatively, you can check your code from the command line by running `npm run lint`.


## Troubleshooting

### Stuck at *Verifying...*

Under certain circumstances, the extension appears to be stuck at *Verifying...*. This occurs due to a stack overflow or some other underlying verification issue.

To overcome this issue, set the environment variable `COMPlus_DefaultStackSize` to a sufficiently large value before starting VSCode. For example:

```sh
# Increase the stack size
export COMPlus_DefaultStackSize=100000
# Launch VSCode
code
```

OR

stop the verification using the stop button on the testing panel.

## Usage

1.  Open a rust crate or workspace in Visual Studio Code
2.  Navigate to the testing panel and expand on the Kani Proofs tree where the proofs are stored
3.  Click on the play button beside the harness or the filename or the crate to run Kani on the respective test case.

## Release Notes

### 0.0.1

-   Initial release (Work in progress)

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This code is distributed under the terms of both the MIT license and the Apache License (Version 2.0).
See [LICENSE-APACHE](LICENSE-APACHE) and [LICENSE-MIT](LICENSE-MIT) for details.
