#!/usr/bin/env node

import { Command } from "commander";
import { registerTenantCommands } from "./commands/tenant";
import { registerRollbackCommand } from "./commands/rollback";
import { registerAgentCommand } from "./commands/agent";

const program = new Command();

program
  .name("opencodeapp")
  .description("OpenCodeApp CLI — manage tenants, run the agent, and manage releases")
  .version("1.0.0");

registerTenantCommands(program);
registerRollbackCommand(program);
registerAgentCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
