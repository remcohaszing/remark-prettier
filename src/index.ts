import { resolve } from 'path';

import * as toMarkdown from 'mdast-util-to-markdown';
import { format, getFileInfo, Options, resolveConfig } from 'prettier';
import { generateDifferences, showInvisibles } from 'prettier-linter-helpers';
import { Plugin } from 'unified';
import { Point } from 'unist';
import { VFile } from 'vfile';

/**
 * Get a unist point from a text offset.
 *
 * @param text - The text to get a point for.
 * @param offset - The offset to get a point for.
 * @returns The unist point for the given offset.
 */
function getPointFromOffset(text: string, offset: number): Point {
  let line = 1;
  let column = 1;
  for (let i = 0; i < offset; i += 1) {
    if (text.charAt(i) === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

/**
 * A remark plugin for linting and formatting files using Prettier.
 *
 * This emits warnings for files that aren’r properly formatted.
 *
 * This also registered a compiler for compiling the AST to markdown.
 */
const remarkPrettier: Plugin<[remarkPrettier.RemarkPrettierOptions?]> = function remarkPrettier({
  format: enableFormat = true,
  report = true,
  options = {},
} = {}) {
  /**
   * Get Prettier options for a file.
   *
   * @returns undefined if the file is ignored by Prettier, otherwise Prettier options the the file.
   */
  const getOptions = (file: VFile): Options | undefined => {
    const path = resolve(file.cwd, file.path || 'readme.md');
    const fileInfo = getFileInfo.sync(path, {
      ignorePath: resolve(file.cwd, '.prettierignore'),
      resolveConfig: true,
    });
    if (fileInfo.ignored) {
      return;
    }

    return {
      ...resolveConfig.sync(path, { editorconfig: true }),
      parser: fileInfo.inferredParser || 'markdown',
      ...options,
    };
  };

  if (enableFormat) {
    this.Compiler = (tree, file) => {
      const prettierOptions = getOptions(file);
      // This is basically all remark-stringfy does, except we don’t accept custom toMarkdown
      // options.
      const markdown = toMarkdown(tree, {
        ...(this.data('settings') as toMarkdown.Options),
        extensions: (this.data('toMarkdownExtensions') || []) as toMarkdown.Options[],
      });
      return prettierOptions ? format(markdown, prettierOptions) : markdown;
    };
  }

  if (report) {
    return (ast, file) => {
      const prettierOptions = getOptions(file);
      if (!prettierOptions) {
        // The file is ignored.
        return;
      }
      const original = file.contents as string;
      const formatted = format(original, prettierOptions);
      if (original === formatted) {
        return;
      }
      const differences = generateDifferences(original, formatted);

      differences.forEach(({ deleteText = '', insertText = '', offset, operation }) => {
        const position = {
          start: getPointFromOffset(original, offset),
          end: getPointFromOffset(original, offset + deleteText.length),
        };

        const toDelete = `\`${showInvisibles(deleteText)}\``;
        const toInsert = `\`${showInvisibles(insertText)}\``;

        const message =
          operation === generateDifferences.DELETE
            ? file.message(`Delete ${toDelete}`, position, 'prettier:delete')
            : operation === generateDifferences.REPLACE
            ? file.message(`Replace ${toDelete} with ${toInsert}`, position, 'prettier:replace')
            : file.message(`Insert ${toInsert}`, position.start, 'prettier:insert');
        message.url = 'https://github.com/remcohaszing/remark-prettier';
      });
    };
  }
};

// eslint-disable-next-line @typescript-eslint/no-namespace, @typescript-eslint/no-redeclare
declare namespace remarkPrettier {
  export interface RemarkPrettierOptions {
    /**
     * Whether or not to format files using Prettier.
     *
     * @default true
     */
    format?: boolean;

    /**
     * Additional Prettier options.
     *
     * These options will override the values in `.editorconfig` and `.prettierrc`. It’s typically
     * not recommended to use this.
     */
    options?: Options;

    /**
     * Whether or not to report Prettier formatting violations.
     *
     * @default true
     */
    report?: boolean;
  }
}

export = remarkPrettier;
