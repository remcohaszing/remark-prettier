import * as remark from 'remark';
import { VFile } from 'vfile';

import * as remarkPrettier from '.';

function representMessages({ messages }: VFile): Partial<VFile['messages'][number]>[] {
  return messages.map(({ location, reason, ruleId, source, url }) => ({
    location,
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
      location: { end: { column: 1, line: 4 }, start: { column: 1, line: 1 } },
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
      location: { end: { column: null, line: null }, start: { column: 6, line: 1 } },
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
      location: { end: { column: 7, line: 2 }, start: { column: 1, line: 1 } },
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
      contents: 'ignored\n\n\n\n',
    });
  expect(representMessages(result)).toStrictEqual([]);
});

it('should respect .editorconfig', async () => {
  const result = await remark().use(remarkPrettier).process('X '.repeat(51));
  expect(representMessages(result)).toStrictEqual([
    {
      location: { end: { column: 103, line: 1 }, start: { column: 100, line: 1 } },
      reason: 'Replace `·X·` with `⏎X⏎`',
      ruleId: 'replace',
      source: 'prettier',
      url: 'https://github.com/remcohaszing/remark-prettier',
    },
  ]);
});

it('should format code using prettier', async () => {
  const { contents } = await remark().use(remarkPrettier).process(`
Title
===

This is
an unformatted document



*   including list items
  `);
  expect(contents).toBe(`# Title

This is an unformatted document

- including list items
`);
});

it('should be possible to disable formatting', async () => {
  const { contents, messages } = await remark().use(remarkPrettier, { format: false }).process(`
Title
===

This document
will be formatted
by remark-strinfigy



*   including list items
  `);
  expect(contents).toBe(`# Title

This document
will be formatted
by remark-strinfigy

*   including list items
`);
  expect(messages.length).toBeGreaterThan(0);
});

it('should be possible to disable reporting', async () => {
  const { contents, messages } = await remark().use(remarkPrettier, { report: false }).process(`
Title
===

This is
an unformatted document



*   including list items
  `);
  expect(contents).toBe(`# Title

This is an unformatted document

- including list items
`);
  expect(messages).toHaveLength(0);
});

it('should support mdx files', async () => {
  const { contents, messages } = await remark()
    .use(remarkPrettier)
    .process({
      history: ['test.mdx'],
      contents: '<div>   <span>Hello MDX</span>   </div>',
    });
  expect(contents).toBe(`<div>
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
      contents: 'Hello world\n\n',
    });
  expect(representMessages(result)).toStrictEqual([
    {
      location: { end: { column: 1, line: 3 }, start: { column: 1, line: 2 } },
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
      contents: 'Hello world\n',
    });
  expect(representMessages(result)).toStrictEqual([
    {
      location: { end: { column: null, line: null }, start: { column: 12, line: 1 } },
      reason: 'Insert `␍`',
      ruleId: 'insert',
      source: 'prettier',
      url: 'https://github.com/remcohaszing/remark-prettier',
    },
  ]);
});
