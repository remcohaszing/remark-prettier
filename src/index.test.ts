import { remark } from 'remark';
import { VFile } from 'vfile';

import remarkPrettier from '.';

function representMessages({ messages }: VFile): Partial<VFile['messages'][number]>[] {
  return messages.map(({ position, reason, ruleId, source, url }) => ({
    position,
    reason,
    ruleId,
    source,
    url,
  }));
}

it('should report prettier diff deletions', async () => {
  const result = await remark().use(remarkPrettier).process('\n\n\n');
  expect(representMessages(result)).toStrictEqual([
    {
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

it('should report prettier diff insertions', async () => {
  const result = await remark().use(remarkPrettier).process('Hello');
  expect(representMessages(result)).toStrictEqual([
    {
      position: { end: { column: null, line: null }, start: { column: 6, line: 1, offset: 5 } },
      reason: 'Insert `⏎`',
      ruleId: 'insert',
      source: 'prettier',
      url: 'https://github.com/remcohaszing/remark-prettier',
    },
  ]);
});

it('should report prettier diff replacements', async () => {
  const result = await remark().use(remarkPrettier).process('\n-  foo');
  expect(representMessages(result)).toStrictEqual([
    {
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

it('should not report anything if there are no differences', async () => {
  const result = await remark().use(remarkPrettier).process('This is ok\n');
  expect(representMessages(result)).toStrictEqual([]);
});

it('should respect .prettierignore', async () => {
  const result = await remark()
    .use(remarkPrettier)
    .process({
      history: ['dist/ignored.md'],
      value: 'ignored\n\n\n\n',
    });
  expect(representMessages(result)).toStrictEqual([]);
});

it('should respect .editorconfig', async () => {
  const result = await remark().use(remarkPrettier).process('X '.repeat(51));
  expect(representMessages(result)).toStrictEqual([
    {
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

it('should format code using prettier', async () => {
  const { value } = await remark().use(remarkPrettier).process(`
Title
===

This is
an unformatted document



*   including list items
  `);
  expect(value).toBe(`# Title

This is an unformatted document

- including list items
`);
});

it('should be possible to disable formatting', async () => {
  const { messages, value } = await remark().use(remarkPrettier, { format: false }).process(`
Title
===

This document
will be formatted
by remark-strinfigy



*   including list items
  `);
  expect(value).toBe(`# Title

This document
will be formatted
by remark-strinfigy

*   including list items
`);
  expect(messages.length).toBeGreaterThan(0);
});

it('should be possible to disable reporting', async () => {
  const { messages, value } = await remark().use(remarkPrettier, { report: false }).process(`
Title
===

This is
an unformatted document



*   including list items
  `);
  expect(value).toBe(`# Title

This is an unformatted document

- including list items
`);
  expect(messages).toHaveLength(0);
});

it('should support mdx files', async () => {
  const { messages, value } = await remark()
    .use(remarkPrettier)
    .process({
      history: ['test.mdx'],
      value: '<div>   <span>Hello MDX</span>   </div>',
    });
  expect(value).toBe(`<div>
  {' '}
  <span>Hello MDX</span>{' '}
</div>
`);
  expect(messages.length).toBeGreaterThan(0);
});

it('should use the prettier markdown parser for unknown file extensions', async () => {
  const result = await remark()
    .use(remarkPrettier)
    .process({
      history: ['test.unknown'],
      value: 'Hello world\n\n',
    });
  expect(representMessages(result)).toStrictEqual([
    {
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

it('should support custom prettier options', async () => {
  const result = await remark()
    .use(remarkPrettier, { options: { endOfLine: 'crlf' } })
    .process({
      history: ['test.unknown'],
      value: 'Hello world\n',
    });
  expect(representMessages(result)).toStrictEqual([
    {
      position: { end: { column: null, line: null }, start: { column: 12, line: 1, offset: 11 } },
      reason: 'Insert `␍`',
      ruleId: 'insert',
      source: 'prettier',
      url: 'https://github.com/remcohaszing/remark-prettier',
    },
  ]);
});
