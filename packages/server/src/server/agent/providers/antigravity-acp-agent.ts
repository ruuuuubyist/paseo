import type { Logger } from "pino";

import type { ACPProviderModeWriteResult, ACPProviderModeWriterContext } from "./acp-agent.js";
import { GenericACPAgentClient } from "./generic-acp-agent.js";
import type { AgentMode } from "../agent-sdk-types.js";

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

const ANTIGRAVITY_KERNEL_DEFAULT_MODE_ID = "default";

// Session modes the kernel reports from session/new. Passed as defaultModes so the handled
// providerModeWriter branch in ACPAgentSession keeps a non-empty mode list after the plan -> default rewrite.
export const ANTIGRAVITY_MODES: AgentMode[] = [
  { id: ANTIGRAVITY_KERNEL_DEFAULT_MODE_ID, label: "Default" },
  { id: "auto_edit", label: "Auto Edit" },
  { id: "yolo", label: "YOLO" },
];

// agy_acp_server does not expose plan as a session mode. providerModeWriter runs before mode validation on both
// setMode and session-start overrides (modeIdTransformer only normalizes incoming mode updates).
export async function writeAntigravityProviderMode(
  context: ACPProviderModeWriterContext,
): Promise<ACPProviderModeWriteResult> {
  if (context.requestedModeId !== "plan") {
    return { handled: false };
  }
  context.logger.info(
    { requestedModeId: context.requestedModeId, modeId: ANTIGRAVITY_KERNEL_DEFAULT_MODE_ID },
    "Antigravity has no plan mode; using the kernel default mode",
  );
  await context.connection.setSessionMode({
    sessionId: context.sessionId,
    modeId: ANTIGRAVITY_KERNEL_DEFAULT_MODE_ID,
  });
  return { handled: true, currentModeId: ANTIGRAVITY_KERNEL_DEFAULT_MODE_ID };
}

export class AntigravityACPAgentClient extends GenericACPAgentClient {
  constructor(options: AntigravityACPAgentClientOptions) {
    super({
      logger: options.logger,
      command: options.command,
      env: options.env,
      providerId: options.providerId,
      label: options.label,
      providerParams: options.providerParams,
      defaultModes: ANTIGRAVITY_MODES,
      waitForInitialCommands: true,
      initialCommandsWaitTimeoutMs: ANTIGRAVITY_INITIAL_COMMANDS_WAIT_TIMEOUT_MS,
      diagnosticPhaseTimeoutMs: ANTIGRAVITY_DIAGNOSTIC_PHASE_TIMEOUT_MS,
      providerModeWriter: writeAntigravityProviderMode,
    });
  }
}
