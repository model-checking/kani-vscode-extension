### Build from Source

The Kani extension is built using NPM and nodejs. Here is the [NPM install guide](https://nodejs.dev/en/learn/how-to-install-nodejs/)
for steps on installing it on your operating system.

You will also need to install `make` on your machine using `apt-get install build-essential` or `brew install make`.

On Ubuntu and MacOS, you can use use the following steps to build and install the extension -

```
git clone https://github.com/model-checking/kani-vscode-extension kani-extension
cd kani-extension
npm install
make
make install
```

The command `make` builds the extension into a file
named `kani-extension-VERSION.vsix` where `VERSION` is the version number
given in package.json.
The command `make install` runs `code` from the command line to
install the extension in Code.

### Packaging

To create a VSIX package of the previously built sources, create the package through the CLI:

```sh
npx vsce package
```

### Coding Conventions

We use ESLint with the TypeScript plugin to ensure code consistency across the whole source. Install the [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) extension in VSCode to have live feedback. Alternatively, you can check your code from the command line by running `npm run lint`.
