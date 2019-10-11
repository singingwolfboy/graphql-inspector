import {Source, print} from 'graphql';
import {loadTypedefsUsingLoaders} from '@graphql-toolkit/core';
import {UrlLoader} from '@graphql-toolkit/url-loader';
import {GraphQLFileLoader} from '@graphql-toolkit/graphql-file-loader';
import {JsonFileLoader} from '@graphql-toolkit/json-file-loader';
import {CodeFileLoader} from '@graphql-toolkit/code-file-loader';

export async function loadDocuments(pointer: string): Promise<Source[]> {
  const documents = await loadTypedefsUsingLoaders(
    [
      new UrlLoader(),
      new GraphQLFileLoader(),
      new JsonFileLoader(),
      new CodeFileLoader(),
    ],
    pointer,
  );

  return documents.map(doc => new Source(print(doc.document), doc.location));
}
