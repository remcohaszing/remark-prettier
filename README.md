# Remark Prettier

[![github actions](https://github.com/remcohaszing/remark-prettier/actions/workflows/ci.yml/badge.svg)](https://github.com/remcohaszing/remark-prettier/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/remcohaszing/remark-prettier/branch/master/graph/badge.svg)](https://codecov.io/gh/remcohaszing/remark-prettier)
[![npm](https://img.shields.io/npm/v/remark-prettier)](https://www.npmjs.com/package/remark-prettier)
[![prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io)

Check and format markdown using Prettier as a [remark](https://github.com/remarkjs/remark) plugin

## Installation

`remark-prettier` has a peer dependency on [prettier](https://prettier.io)

```sh
npm install prettier remark-prettier
```

## Usage

By default this plugin does 2 things:

- Report differences from the Prettier formatting.
- Format the document using Prettier.

It has support for Prettier configuration files: `.editorconfig`, `.prettierrc*`, and
`.prettierignore`.

For example, running `remark --use remark-prettier .` may yield:

```sh
README.md
  18:30-19:1  warning  Replace `⏎` with `·`  replace  prettier
        38:1  warning  Insert `⏎`            insert   prettier
  40:32-41:1  warning  Delete `⏎`            delete   prettier
```

This can also be spcified in a `.remarkrc` file:

```json
{
  "plugins": ["remark-prettier"]
}
```

This plugin can also be used with programmatically:

```js
import remark from 'remark';
import remarkPrettier from 'remark-prettier';
import { readSync } from 'to-vfile';

remark()
  .use(remarkPrettier)
  .process(readSync('README.md'))
  .then(({ content, messages }) => {
    // Formatted content
    console.log(content);

    // Prettier formatting violations
    console.dir(messages);
  });
```

`remark-prettier` registers a unified compiler. This means this plugin is used for formatting the
document. Usually this is done by `remark-stringify`. When building a custom unified processor,
`remark-stringify` can be omitted. If multiple compilers are registered, the last one registered is
used.

```js
import remarkParse from 'remark-parse';
import remarkPrettier from 'remark-prettier';
import { readSync } from 'to-vfile';
import unified from 'unified';

unified()
  .use(remarkParse)
  .use(remarkPrettier)
  .process(readSync('README.md'))
  .then(({ content, messages }) => {
    // Formatted content
    console.log(content);

    // Prettier formatting violations
    console.dir(messages);
  });
```

### Options

The first argument may contain the options below. A second argument may specify overrides for the
Prettier configuration, although this isn’t recommended.

## `format`

By default `remark-prettier` registers a unified compiler, which formats the document using
Prettier. This behaviour can be disabled by setting this option to `false`. (Default `true`)

## `report`

By default `remark-prettier` reports differences from document as Prettier would format it. This
behaviour can be disabled by setting this option to `false`. (Default `true`)

## See also

- [eslint-plugin-prettier](https://github.com/prettier/eslint-plugin-prettier)
- [prettier](https://prettier.io)
- [remark](https://github.com/remarkjs/remark)
- [stylelint-prettier](https://github.com/prettier/stylelint-prettier)

## License

[MIT](LICENSE.md) © [Remco Haszing](https://github.com/remcohaszing)
