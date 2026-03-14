// ═══════════════════════════════════════════════════════════════════════════
// Permission System — User approval flow with risk-based decisions
// ═══════════════════════════════════════════════════════════════════════════

import chalk from "chalk";
import { createInterface } from "readline";
import { getToolRisk, type ToolRiskLevel } from "./tools/definitions.js";
import type { DeepAgentConfig } from "./config.js";

export interface PermissionRequest {
  tool_name: string;
  args: Record<string, any>;
  risk_level: ToolRiskLevel;
  description: string;
}

export interface PermissionResult {
  approved: boolean;
  reason?: string;
}

// Session-level approved patterns
const sessionApproved = new Set<string>();

// ─── Ask for user permission ───────────────────────────────────────────────
export async function requestPermission(
  config: DeepAgentConfig,
  toolName: string,
  args: Record<string, any>,
): Promise<PermissionResult> {
  const risk = getToolRisk(toolName, args);

  // YOLO mode: approve everything (not recommended)
  if (config.permission_mode === "yolo") {
    return { approved: true };
  }

  // Safe operations always pass
  if (risk === "safe") {
    return { approved: true };
  }

  // Moderate mode: auto-approve moderate risk, ask for dangerous
  if (config.permission_mode === "moderate" && risk === "moderate") {
    // Check auto-approve patterns
    if (toolName === "execute_shell") {
      const baseCmd = (args.command || "").trim().split(/\s+/)[0];
      if (config.auto_approve_patterns.includes(baseCmd)) {
        return { approved: true };
      }
    }
    // Check session-approved patterns
    const key = `${toolName}:${JSON.stringify(args)}`;
    if (sessionApproved.has(key)) {
      return { approved: true };
    }
  }

  // Strict mode OR dangerous action: always ask
  return promptUser(toolName, args, risk);
}

// ─── Interactive prompt ────────────────────────────────────────────────────
async function promptUser(
  toolName: string,
  args: Record<string, any>,
  risk: ToolRiskLevel,
): Promise<PermissionResult> {
  const riskColors = {
    safe: chalk.green,
    moderate: chalk.yellow,
    dangerous: chalk.red,
  };

  const riskIcons = {
    safe: "✅",
    moderate: "⚠️",
    dangerous: "🚨",
  };

  console.log();
  console.log(chalk.dim("─".repeat(60)));
  console.log(`${riskIcons[risk]} ${riskColors[risk](`İZİN GEREKLİ`)} ${chalk.dim(`[${risk}]`)}`);
  console.log();

  // Display tool and args nicely
  console.log(chalk.bold(`  Araç: `) + chalk.cyan(toolName));

  for (const [key, value] of Object.entries(args)) {
    const displayValue = typeof value === "string" && value.length > 200
      ? value.slice(0, 200) + "..."
      : String(value);

    if (key === "command") {
      console.log(chalk.bold(`  Komut: `) + chalk.white(displayValue));
    } else if (key === "content" && displayValue.length > 100) {
      console.log(chalk.bold(`  ${key}: `) + chalk.dim(`[${displayValue.length} karakter]`));
    } else {
      console.log(chalk.bold(`  ${key}: `) + chalk.white(displayValue));
    }
  }

  console.log();
  console.log(chalk.dim("  [e] Onayla  [h] Reddet  [s] Bu oturum için hep onayla  [q] Çık"));
  console.log(chalk.dim("─".repeat(60)));

  const answer = await askLine(chalk.bold("  Karar > "));
  const normalized = answer.trim().toLowerCase();

  if (normalized === "e" || normalized === "y" || normalized === "evet" || normalized === "yes") {
    return { approved: true };
  }

  if (normalized === "s") {
    // Add to session-approved
    sessionApproved.add(`${toolName}:${JSON.stringify(args)}`);
    return { approved: true };
  }

  if (normalized === "q" || normalized === "quit") {
    console.log(chalk.yellow("\n  Agent döngüsü durduruldu.\n"));
    return { approved: false, reason: "user_quit" };
  }

  return { approved: false, reason: "user_denied" };
}

// ─── Readline helper ───────────────────────────────────────────────────────
function askLine(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// ─── Reset session approvals ───────────────────────────────────────────────
export function resetSessionApprovals(): void {
  sessionApproved.clear();
}
