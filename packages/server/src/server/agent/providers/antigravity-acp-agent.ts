import type { Logger } from "pino";

import { GenericACPAgentClient } from "./generic-acp-agent.js";

interface AntigravityACPAgentClientOptions {
  logger: Logger;
  command: [string, ...string[]];
  env?: Record<string, string>;
  providerId?: string;
  label?: string;
  providerParams?: unknown;
}

// agy_acp_server is a PyInstaller onefile binary. The first spawn unpacks the archive (measured ~6s on
// macOS arm64, slower on Windows); later spawns take ~1s. Widen the default 20s probe budget for that.
const ANTIGRAVITY_DIAGNOSTIC_PHASE_TIMEOUT_MS = 45_000;

// agy_acp_server sends available_commands_update asynchronously right after session/new resolves,
// so wait for it; the cap only bounds the case where it never arrives.
const ANTIGRAVITY_INITIAL_COMMANDS_WAIT_TIMEOUT_MS = 5_000;

export class AntigravityACPAgentClient extends GenericACPAgentClient {
  constructor(options: AntigravityACPAgentClientOptions) {
    super({
      logger: options.logger,
      command: options.command,
      env: options.env,
      providerId: options.providerId,
      label: options.label,
      providerParams: options.providerParams,
      waitForInitialCommands: true,
      initialCommandsWaitTimeoutMs: ANTIGRAVITY_INITIAL_COMMANDS_WAIT_TIMEOUT_MS,
      diagnosticPhaseTimeoutMs: ANTIGRAVITY_DIAGNOSTIC_PHASE_TIMEOUT_MS,
    });
  }
}
