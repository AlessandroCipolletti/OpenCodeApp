#!/usr/bin/env node
import { Command } from 'commander';
import { tenantCreateCommand } from './commands/tenant-create';
import { extBuildCommand } from './commands/ext-build';
import { historyListCommand } from './commands/history-list';
import { historyRollbackCommand } from './commands/history-rollback';

const program = new Command();

program
  .name('opencodeapp')
  .description('OpenCodeApp CLI')
  .version('0.1.0');

program.addCommand(tenantCreateCommand());
program.addCommand(extBuildCommand());
program.addCommand(historyListCommand());
program.addCommand(historyRollbackCommand());

program.parse(process.argv);
