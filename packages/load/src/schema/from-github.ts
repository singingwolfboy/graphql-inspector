import fetch from 'node-fetch';
import {buildClientSchema, buildSchema, printSchema, parse} from 'graphql';
import {SchemaLoader, Source} from 'graphql-config';

import {SchemaHandler, SchemaLoader as _SchemaLoader} from './loader';

function isGithub(pointer: string): boolean {
  return pointer.toLowerCase().startsWith('github:');
}

// github:owner/name#ref:path/to/file
function extractData(
  pointer: string,
): {
  owner: string;
  name: string;
  ref: string;
  path: string;
} {
  const [repo, file] = pointer.split('#');
  const [owner, name] = repo.split(':')[1].split('/');
  const [ref, path] = file.split(':');

  return {
    owner,
    name,
    ref,
    path,
  };
}

export const fromGithub: SchemaHandler = function fromGithub(
  pointer,
  options: {
    token: string;
  },
) {
  if (isGithub(pointer)) {
    return async function load() {
      const {owner, name, ref, path} = extractData(pointer);
      const request = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `bearer ${options.token}`,
        },
        body: JSON.stringify({
          query: `
            query GetGraphQLSchemaForGraphQLInspector($owner: String!, $name: String!, $expression: String!) {
              repository(owner: $owner, name: $name) {
                object(expression: $expression) {
                  ... on Blob {
                    text
                  }
                }
              }
            }
          `,
          variables: {
            owner,
            name,
            expression: ref + ':' + path,
          },
          operationName: 'GetGraphQLSchemaForGraphQLInspector',
        }),
      });
      const response = await request.json();

      let errorMessage: string | null = null;

      if (response.errors && response.errors.length > 0) {
        errorMessage = response.errors
          .map((item: Error) => item.message)
          .join(', ');
      } else if (!response.data) {
        errorMessage = response;
      }

      if (errorMessage) {
        throw new Error(
          'Unable to download schema from github: ' + errorMessage,
        );
      }

      const text = response.data.repository.object.text;

      if (/\.(gql|graphql)s?$/i.test(path)) {
        return buildSchema(text);
      }

      if (/\.json$/i.test(path)) {
        return buildClientSchema(JSON.parse(text));
      }

      throw new Error('Unable to build schema from github');
    };
  }
};

export const GithubLoader: SchemaLoader = {
  loaderId() {
    return 'github-loader';
  },
  async canLoad(pointer) {
    return typeof pointer === 'string' && !!fromGithub(pointer);
  },
  async load(pointer) {
    const load: _SchemaLoader = fromGithub(pointer) as any;

    return new Source({
      location: pointer,
      document: parse(printSchema(await load())),
    });
  },
};
