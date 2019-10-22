import * as isValidPath from 'is-valid-path';
import {writeFileSync} from 'fs';
import {extname} from 'path';
import {
  coverage as calculateCoverage,
  SchemaCoverage,
} from '@graphql-inspector/core';
import {loadSchema, loadDocuments} from '@graphql-inspector/load';
import {GraphQLSchema, Source} from 'graphql';

import {ensureAbsolute} from '../utils/fs';
import {Renderer, ConsoleRenderer} from '../render';

export function outputJSON(coverage: SchemaCoverage): string {
  return JSON.stringify(coverage, null, 2);
}

export async function runCoverage({
  documents,
  schema,
  renderer,
  writePath,
  silent,
}: {
  documents: Source[];
  schema: GraphQLSchema;
  renderer: Renderer;
  writePath?: string;
  silent?: boolean;
}) {
  const shouldWrite = typeof writePath !== 'undefined';

  const coverage = calculateCoverage(schema, documents);

  if (!silent) {
    renderer.coverage(coverage);
  }

  if (shouldWrite) {
    if (typeof writePath !== 'string' || !isValidPath(writePath)) {
      throw new Error(`--write is not valid file path: ${writePath}`);
    }

    const absPath = ensureAbsolute(writePath);
    const ext = extname(absPath)
      .replace('.', '')
      .toLocaleLowerCase();

    let output: string | undefined = undefined;

    if (ext === 'json') {
      output = outputJSON(coverage);
    }

    if (output) {
      writeFileSync(absPath, output, {
        encoding: 'utf-8',
      });

      renderer.success('Available at', absPath, '\n');
    } else {
      throw new Error(`Extension ${ext} is not supported`);
    }
  }
}

export async function coverage(
  documentsPointer: string,
  schemaPointer: string,
  options: {
    require: string[];
    write?: string;
    silent?: boolean;
    renderer?: Renderer;
    headers?: Record<string, string>;
  },
) {
  const renderer = options.renderer || new ConsoleRenderer();
  const silent = options.silent === true;
  const writePath = options.write;

  try {
    const schema = await loadSchema(schemaPointer, {
      headers: options.headers,
    });
    const documents = await loadDocuments(documentsPointer);

    await runCoverage({
      schema,
      documents,
      renderer,
      silent,
      writePath,
    });
  } catch (e) {
    renderer.error(e);
    process.exit(1);
  }

  process.exit(0);
}
