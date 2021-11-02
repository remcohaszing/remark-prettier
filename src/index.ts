import { resolve } from 'path';

import * as toMarkdown from 'mdast-util-to-markdown';
import { format, getFileInfo, Options, resolveConfig } from 'prettier';
import { generateDifferences, showInvisibles } from 'prettier-linter-helpers';
import { Plugin } from 'unified';
import { VFile } from 'vfile';
import * as location from 'vfile-location';

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
      const original = String(file);
      const formatted = format(original, prettierOptions);
      if (original === formatted) {
        return;
      }
      const differences = generateDifferences(original, formatted);
      const { toPoint } = location(file);

      for (const { deleteText = '', insertText = '', offset, operation } of differences) {
        const position = {
          start: toPoint(offset),
          end: toPoint(offset + deleteText.length),
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
      }
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
