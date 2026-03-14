import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// ─── Config Paths ──────────────────────────────────────────────────────────
const CONFIG_DIR = join(homedir(), ".config", "deepagent");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const SESSIONS_DIR = join(CONFIG_DIR, "sessions");
const RULES_FILE = join(CONFIG_DIR, "rules.md");

export interface DeepAgentConfig {
  api_key: string;
  base_url: string;
  model: string;
  max_tokens: number;
  temperature: number;
  // Permission levels
  permission_mode: "strict" | "moderate" | "yolo";
  // Auto-approve patterns (for moderate mode)
  auto_approve_patterns: string[];
  // Blocked commands (always require approval)
  blocked_commands: string[];
  // Max concurrent tool calls
  max_iterations: number;
  // Session
  save_sessions: boolean;
  // System prompt customization
  custom_system_prompt: string;
}

const DEFAULT_CONFIG: DeepAgentConfig = {
  api_key: "",
  base_url: "https://api.deepseek.com",
  model: "deepseek-chat",
  max_tokens: 8192,
  temperature: 0.0,
  permission_mode: "strict",
  auto_approve_patterns: [
    "ls", "cat", "head", "tail", "wc", "echo", "date", "whoami",
    "pwd", "which", "file", "stat", "df", "free", "uname",
    "find", "grep", "awk", "sed", "sort", "uniq", "tr", "cut",
  ],
  blocked_commands: [
    "rm -rf /", "mkfs", "dd if=", ":(){:|:&};:", "chmod -R 777 /",
    "shutdown", "reboot", "init 0", "init 6", "halt", "poweroff",
    "> /dev/sda", "mv / ", "wget | sh", "curl | sh", "curl | bash",
  ],
  max_iterations: 25,
  save_sessions: true,
  custom_system_prompt: "",
};

// ─── Ensure directories exist ──────────────────────────────────────────────
export function ensureConfigDirs(): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  if (!existsSync(SESSIONS_DIR)) mkdirSync(SESSIONS_DIR, { recursive: true });
}

// ─── Load / Save Config ────────────────────────────────────────────────────
export function loadConfig(): DeepAgentConfig {
  ensureConfigDirs();
  if (!existsSync(CONFIG_FILE)) {
    saveConfig(DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: DeepAgentConfig): void {
  ensureConfigDirs();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

// ─── Load custom rules ─────────────────────────────────────────────────────
export function loadCustomRules(): string {
  if (existsSync(RULES_FILE)) {
    return readFileSync(RULES_FILE, "utf-8");
  }
  return "";
}

// ─── Session management ────────────────────────────────────────────────────
export interface SessionData {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  messages: any[];
  token_usage: { input: number; output: number };
}

export function saveSession(session: SessionData): void {
  ensureConfigDirs();
  const path = join(SESSIONS_DIR, `${session.id}.json`);
  writeFileSync(path, JSON.stringify(session, null, 2), "utf-8");
}

export function loadSession(id: string): SessionData | null {
  const path = join(SESSIONS_DIR, `${id}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

export function listSessions(): SessionData[] {
  ensureConfigDirs();
  const files = Bun.spawnSync(["ls", SESSIONS_DIR]).stdout.toString().trim().split("\n").filter(Boolean);
  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        return JSON.parse(readFileSync(join(SESSIONS_DIR, f), "utf-8"));
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export { CONFIG_DIR, CONFIG_FILE, SESSIONS_DIR, RULES_FILE };
