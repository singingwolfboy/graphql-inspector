import * as logSymbols from 'log-symbols';
import chalk from 'chalk';
import indent = require('indent-string');
import {
  Change,
  CriticalityLevel,
  InvalidDocument,
  SchemaCoverage,
  getTypePrefix,
} from '@graphql-inspector/core';

export function getSymbol(level: CriticalityLevel): string {
  const symbols = {
    [CriticalityLevel.Dangerous]: logSymbols.warning,
    [CriticalityLevel.Breaking]: logSymbols.error,
    [CriticalityLevel.NonBreaking]: logSymbols.success,
  };

  return symbols[level];
}

export function renderChange(change: Change): string[] {
  return [getSymbol(change.criticality.level), bolderize(change.message)];
}

export function bolderize(msg: string): string {
  const findSingleQuotes = /\'([^']+)\'/gim;
  const findDoubleQuotes = /\"([^"]+)\"/gim;

  return msg
    .replace(findSingleQuotes, (_: string, value: string) => chalk.bold(value))
    .replace(findDoubleQuotes, (_: string, value: string) => chalk.bold(value));
}

export function renderInvalidDocument(invalidDoc: InvalidDocument): string[] {
  const errors = invalidDoc.errors
    .map(e => ` - ${bolderize(e.message)}`)
    .join('\n');

  return [
    chalk.redBright('error'),
    `in ${invalidDoc.source.name}:\n\n`,
    errors,
    '\n\n',
  ];
}

export function renderDeprecatedUsageInDocument(
  invalidDoc: InvalidDocument,
  isCritical = false,
): string[] {
  const deprecated = invalidDoc.deprecated
    .map(e => ` - ${bolderize(e.message)}`)
    .join('\n');

  return [
    isCritical ? chalk.redBright('error') : chalk.yellowBright('warn'),
    `in ${invalidDoc.source.name}:\n\n`,
    deprecated,
    '\n\n',
  ];
}

export interface Renderer {
  emit(...msgs: string[]): void;
  success(...msgs: string[]): void;
  error(...msgs: string[]): void;
  coverage(coverage: SchemaCoverage): void;
  print?(): void;
}

export class ConsoleRenderer implements Renderer {
  emit(...msgs: string[]) {
    console.log(...msgs);
  }

  coverage(coverage: SchemaCoverage) {
    this.success('Schema coverage based on documents:\n');

    for (const typeName in coverage.types) {
      if (coverage.types.hasOwnProperty(typeName)) {
        const typeCoverage = coverage.types[typeName];

        this.emit(
          chalk.grey(getTypePrefix(typeCoverage.type)),
          chalk.bold(`${typeName}`),
          chalk.grey('{'),
        );

        for (const childName in typeCoverage.children) {
          if (typeCoverage.children.hasOwnProperty(childName)) {
            const childCoverage = typeCoverage.children[childName];

            if (childCoverage.hits) {
              this.emit(
                indent(childName, 2),
                chalk.italic.grey(`x ${childCoverage.hits}`),
              );
            } else {
              this.emit(
                chalk.redBright(indent(childName, 2)),
                chalk.italic.grey('x 0'),
              );
            }
          }
        }

        this.emit(chalk.grey('}\n'));
      }
    }
  }

  success(...msgs: string[]) {
    this.emit(`\n${chalk.greenBright('success')} ${msgs.join(' ')}`);
  }

  error(...msgs: string[]) {
    this.emit(`\n${chalk.redBright('error')} ${msgs.join(' ')}`);
  }
}

export class ConsoleBufferRenderer extends ConsoleRenderer {
  messages: string[][] = [];

  emit(...msgs: string[]) {
    this.messages.push(msgs);
  }

  print() {
    const messages = this.messages;
    this.messages = [];

    messages.forEach(msgs => {
      console.log(...msgs);
    });
  }
}
