import {
  diff as diffSchema,
  DiffRule,
  Change,
  CriticalityLevel,
  Rule,
} from '@graphql-inspector/core';
import {loadSchema} from '@graphql-inspector/load';
import {existsSync} from 'fs';
import {GraphQLSchema} from 'graphql';

import {renderChange, Renderer, ConsoleRenderer} from '../render';
import {ensureAbsolute} from '../utils/fs';

function hasBreaking(changes: Change[]): boolean {
  return changes.some(c => c.criticality.level === CriticalityLevel.Breaking);
}

function resolveRule(name: string): Rule | undefined {
  const filepath = ensureAbsolute(name);
  if (existsSync(filepath)) {
    return require(filepath);
  }

  return DiffRule[name as keyof typeof DiffRule];
}

export async function runDiff(options: {
  oldSchema: GraphQLSchema;
  newSchema: GraphQLSchema;
  renderer: Renderer;
  rule?: Array<string>;
}) {
  const {oldSchema, newSchema, renderer} = options;
  try {
    const rules = options.rule
      ? options.rule
          .map(
            (name): Rule => {
              const rule = resolveRule(name);

              if (!rule) {
                throw new Error(`\Rule '${name}' does not exist!\n`);
              }

              return rule;
            },
          )
          .filter(f => f)
      : [];
    const changes = diffSchema(oldSchema, newSchema, rules);

    if (!changes.length) {
      renderer.success('No changes detected');
      return;
    } else {
      renderer.emit(
        `\nDetected the following changes (${changes.length}) between schemas:\n`,
      );

      changes.forEach(change => {
        renderer.emit(...renderChange(change));
      });

      if (hasBreaking(changes)) {
        const breakingCount = changes.filter(
          c => c.criticality.level === CriticalityLevel.Breaking,
        ).length;

        throw new Error(
          `Detected ${breakingCount} breaking change${
            breakingCount > 1 ? 's' : ''
          }\n`,
        );
      } else {
        renderer.success('No breaking changes detected\n');
        return;
      }
    }
  } catch (e) {
    throw e;
  }
}

export async function diff(
  oldSchemaPointer: string,
  newSchemaPointer: string,
  options: {
    token?: string;
    renderer?: Renderer;
    require?: string[];
    rule?: Array<string>;
    headers?: Record<string, string>;
  },
) {
  const renderer = (options && options.renderer) || new ConsoleRenderer();

  try {
    const oldSchema = await loadSchema(oldSchemaPointer, {
      token: options.token,
      headers: options.headers,
    });
    const newSchema = await loadSchema(newSchemaPointer, {
      token: options.token,
      headers: options.headers,
    });
    await runDiff({oldSchema, newSchema, renderer, rule: options.rule});
  } catch (e) {
    renderer.error(e.message || e);
    process.exit(1);
  }
}
