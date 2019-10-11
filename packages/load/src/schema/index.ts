import {GraphQLSchema, isSchema, DocumentNode, buildASTSchema} from 'graphql';
import {loadSchemaUsingLoaders} from '@graphql-toolkit/core';
import {UrlLoader} from '@graphql-toolkit/url-loader';
import {GraphQLFileLoader} from '@graphql-toolkit/graphql-file-loader';
import {JsonFileLoader} from '@graphql-toolkit/json-file-loader';
import {CodeFileLoader} from '@graphql-toolkit/code-file-loader';

import {fromGithub} from './from-github';
import {fromGit} from './from-git';

export async function loadSchema(
  pointer: string,
  extra?: any,
): Promise<GraphQLSchema> {
  const useGithub = fromGithub(pointer, extra);

  if (useGithub) {
    return useGithub();
  }

  const useGit = fromGit(pointer);

  if (useGit) {
    return useGit();
  }

  const resolved = await loadSchemaUsingLoaders(
    [
      new UrlLoader(),
      new GraphQLFileLoader(),
      new JsonFileLoader(),
      new CodeFileLoader(),
    ],
    pointer,
    extra || {},
  );

  if (isSchema(resolved)) {
    return resolved;
  }

  if (isDocumentNode(resolved)) {
    return buildASTSchema(resolved);
  }

  throw new Error(`Couldn't handle ${pointer}`);
}

function isDocumentNode(doc: any): doc is DocumentNode {
  return !!doc.kind;
}
