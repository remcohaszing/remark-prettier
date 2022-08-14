import { remark } from 'remark';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { VFile } from 'vfile';

import remarkPrettier from './index.js';

/**
 * Represent vfile messages in a format that can be compared by uvu.
 *
 * @param vfile The vfile whose messages to represent.
 * @returns The messages in a format that can be compared by uvu.
 */
function representMessages({ messages }: VFile): Partial<VFile['messages'][number]>[] {
  return messages.map(({ expected, position, reason, ruleId, source, url }) => ({
    expected,
    position,
    reason,
    ruleId,
    source,
    url,
  }));
}

test('should report prettier diff deletions', async () => {
  const result = await remark().use(remarkPrettier).process('\n\n\n');
  assert.equal(representMessages(result), [
    {
      expected: [''],
      position: {
        end: { column: 1, line: 4, offset: 3 },
        start: { column: 1, line: 1, offset: 0 },
      },
      reason: 'Delete `⏎⏎⏎`',
      ruleId: 'delete',
      source: 'prettier',
      url: 'https://github.com/remcohaszing/remark-prettier',
    },
  ]);
});

test('should report prettier diff insertions', async () => {
  const result = await remark().use(remarkPrettier).process('Hello');
  assert.equal(representMessages(result), [
    {
      expected: ['\n'],
      position: { end: { column: null, line: null }, start: { column: 6, line: 1, offset: 5 } },
      reason: 'Insert `⏎`',
      ruleId: 'insert',
      source: 'prettier',
      url: 'https://github.com/remcohaszing/remark-prettier',
    },
  ]);
});

test('should report prettier diff replacements', async () => {
  const result = await remark().use(remarkPrettier).process('\n-  foo');
  assert.equal(representMessages(result), [
    {
      expected: ['- foo\n'],
      position: {
        end: { column: 7, line: 2, offset: 7 },
        start: { column: 1, line: 1, offset: 0 },
      },
      reason: 'Replace `⏎-··foo` with `-·foo⏎`',
      ruleId: 'replace',
      source: 'prettier',
      url: 'https://github.com/remcohaszing/remark-prettier',
    },
  ]);
});

test('should not report anything if there are no differences', async () => {
  const result = await remark().use(remarkPrettier).process('This is ok\n');
  assert.equal(representMessages(result), []);
});

test('should respect .prettierignore', async () => {
  const result = await remark()
    .use(remarkPrettier)
    .process({
      history: ['dist/ignored.md'],
      value: 'ignored\n\n\n\n',
    });
  assert.equal(representMessages(result), []);
});

test('should respect .editorconfig', async () => {
  const result = await remark().use(remarkPrettier).process('X '.repeat(51));
  assert.equal(representMessages(result), [
    {
      expected: ['\nX\n'],
      position: {
        end: { column: 103, line: 1, offset: 102 },
        start: { column: 100, line: 1, offset: 99 },
      },
      reason: 'Replace `·X·` with `⏎X⏎`',
      ruleId: 'replace',
      source: 'prettier',
      url: 'https://github.com/remcohaszing/remark-prettier',
    },
  ]);
});

test('should format code using prettier', async () => {
  const { value } = await remark().use(remarkPrettier).process(`
Title
===

This is
an unformatted document



*   including list items
  `);
  assert.equal(
    value,
    `# Title

This is an unformatted document

- including list items
`,
  );
});

test('should be possible to disable formatting', async () => {
  const { messages, value } = await remark().use(remarkPrettier, { format: false }).process(`
Title
===

This document
will be formatted
by remark-strinfigy



*   including list items
  `);
  assert.equal(
    value,
    `# Title

This document
will be formatted
by remark-strinfigy

*   including list items
`,
  );
  assert.ok(messages.length > 0);
});

test('should be possible to disable reporting', async () => {
  const { messages, value } = await remark().use(remarkPrettier, { report: false }).process(`
Title
===

This is
an unformatted document



*   including list items
  `);
  assert.equal(
    value,
    `# Title

This is an unformatted document

- including list items
`,
  );
  assert.equal(messages, []);
});

test('should support mdx files', async () => {
  const { messages, value } = await remark()
    .use(remarkPrettier)
    .process({
      history: ['test.mdx'],
      value: '<div>   <span>Hello MDX</span>   </div>',
    });
  assert.equal(
    value,
    `<div>
  {' '}
  <span>Hello MDX</span>{' '}
</div>
`,
  );
  assert.ok(messages.length > 0);
});

test('should use the prettier markdown parser for unknown file extensions', async () => {
  const result = await remark()
    .use(remarkPrettier)
    .process({
      history: ['test.unknown'],
      value: 'Hello world\n\n',
    });
  assert.equal(representMessages(result), [
    {
      expected: [''],
      position: {
        end: { column: 1, line: 3, offset: 13 },
        start: { column: 1, line: 2, offset: 12 },
      },
      reason: 'Delete `⏎`',
      ruleId: 'delete',
      source: 'prettier',
      url: 'https://github.com/remcohaszing/remark-prettier',
    },
  ]);
});

test('should support custom prettier options', async () => {
  const result = await remark()
    .use(remarkPrettier, { options: { endOfLine: 'crlf' } })
    .process({
      history: ['test.unknown'],
      value: 'Hello world\n',
    });
  assert.equal(representMessages(result), [
    {
      expected: ['\r'],
      position: { end: { column: null, line: null }, start: { column: 12, line: 1, offset: 11 } },
      reason: 'Insert `␍`',
      ruleId: 'insert',
      source: 'prettier',
      url: 'https://github.com/remcohaszing/remark-prettier',
    },
  ]);
});

test.run();
