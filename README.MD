# @stellar-expert/lib-webpack-template

> Webpack+Babel building system for StellarExpert utility libraries

### Installation

```shell
npm i -D @stellar-expert/lib-webpack-template webpack-cli
```

### Usage

#### Babel configuration

Create file `babel.config.js` in the project root:

```js
const {createBabelConfig} = require('@stellar-expert/lib-webpack-template')

module.exports = createBabelConfig()
//or add additional plugins (only if needed)
module.exports = createBabelConfig([
    ['@babel/plugin-proposal-class-properties', {loose: true}]
])
```

#### Webpack configuration

Create file `webpack-config.js` in the project root:

```js
const path = require('path')
const {initWebpackConfig} = require('@stellar-expert/lib-webpack-template')

module.exports = initWebpackConfig({
    libName: 'libUniqueName',
    inputPath: './index.js',
    outputPath: './lib'
})

```

#### Build scripts

Add the following two script entries to the project's `package.json`:

```json
{
  
  "scripts": {
    "build": "webpack --mode=production --config ./webpack-config.js"
  }
}
```

#### PNPM support

For this building system to properly work with `pnpm` package manager, it is required to create `.npmrc` file in the project root.

```
auto-install-peers=true
shamefully-hoist=true
```

### Finding duplicates (optional)

```shell
npm i -D inspectpack
```

If you have `inspectpack` package installed, duplicates will be detected automatically.