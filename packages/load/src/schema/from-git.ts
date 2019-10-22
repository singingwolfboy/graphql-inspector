import * as simplegit from 'simple-git/promise';
import {buildSchema, buildClientSchema, printSchema, parse} from 'graphql';
import {SchemaLoader, Source} from 'graphql-config';

import {SchemaHandler, SchemaLoader as _SchemaLoader} from './loader';

function isGit(pointer: string): boolean {
  return pointer.toLowerCase().startsWith('git:');
}

// git:branch:path/to/file
function extractData(
  pointer: string,
): {
  ref: string;
  path: string;
} {
  const parts = pointer.replace(/^git\:/i, '').split(':');

  if (!parts || parts.length !== 2) {
    throw new Error(
      'Schema pointer should match "git:branchName:path/to/file"',
    );
  }

  return {
    ref: parts[0],
    path: parts[1],
  };
}

export const fromGit: SchemaHandler = function fromGit(pointer) {
  if (isGit(pointer)) {
    return async function load() {
      const {ref, path} = extractData(pointer);
      const git = simplegit();

      let schemaString: string;

      try {
        schemaString = await git.show([`${ref}:${path}`]);
      } catch (error) {
        throw new Error('Unable to load schema from git: ' + error);
      }

      if (/\.(gql|graphql)s?$/i.test(path)) {
        return buildSchema(schemaString);
      }

      if (/\.json$/i.test(path)) {
        return buildClientSchema(JSON.parse(schemaString));
      }

      throw new Error('Unable to build schema from git');
    };
  }
};

export const GitLoader: SchemaLoader = {
  loaderId() {
    return 'git-loader';
  },
  async canLoad(pointer) {
    return typeof pointer === 'string' && !!fromGit(pointer);
  },
  async load(pointer) {
    const load: _SchemaLoader = fromGit(pointer) as any;

    return new Source({
      location: pointer,
      document: parse(printSchema(await load())),
    });
  },
};
