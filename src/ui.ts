// ═══════════════════════════════════════════════════════════════════════════
// DeepAgent TUI — Terminal User Interface
// ═══════════════════════════════════════════════════════════════════════════

import chalk from "chalk";
import { createInterface } from "readline";
import { Marked } from "marked";
import markedTerminal from "marked-terminal";

// ─── Markdown Renderer ─────────────────────────────────────────────────────
const marked = new Marked(markedTerminal() as any);

export function renderMarkdown(text: string): string {
  try {
    return (marked.parse(text) as string).trim();
  } catch {
    return text;
  }
}

// ─── Banner ────────────────────────────────────────────────────────────────
export function printBanner(): void {
  const banner = chalk.bold.cyan(`
  ╔══════════════════════════════════════════════════╗
  ║                                                  ║
  ║              ${chalk.white("D E E P A G E N T")}                 ║
  ║                                                  ║
  ║       ${chalk.dim("Linux AI Agent · DeepSeek Powered")}        ║
  ║                                                  ║
  ╚══════════════════════════════════════════════════╝
`);
  console.log(banner);
}

// ─── Status Bar ────────────────────────────────────────────────────────────
export function printStatusBar(config: {
  model: string;
  permission_mode: string;
  sessionId?: string;
}): void {
  const modeColors: Record<string, any> = {
    strict: chalk.green("strict"),
    moderate: chalk.yellow("moderate"),
    yolo: chalk.red("yolo"),
  };

  const parts = [
    chalk.dim("Model: ") + chalk.cyan(config.model),
    chalk.dim("Güvenlik: ") + (modeColors[config.permission_mode] || config.permission_mode),
  ];
  if (config.sessionId) {
    parts.push(chalk.dim("Oturum: ") + chalk.dim(config.sessionId));
  }

  console.log(chalk.dim("  " + parts.join("  │  ")));
  console.log();
}

// ─── Help ──────────────────────────────────────────────────────────────────
export function printHelp(): void {
  console.log(chalk.bold("\n  Komutlar:"));
  console.log(chalk.cyan("  /help        ") + chalk.dim("Bu yardım mesajını göster"));
  console.log(chalk.cyan("  /clear       ") + chalk.dim("Konuşma geçmişini temizle"));
  console.log(chalk.cyan("  /sessions    ") + chalk.dim("Kayıtlı oturumları listele"));
  console.log(chalk.cyan("  /load <id>   ") + chalk.dim("Bir oturumu yükle"));
  console.log(chalk.cyan("  /mode <m>    ") + chalk.dim("Güvenlik modunu değiştir (strict/moderate/yolo)"));
  console.log(chalk.cyan("  /model <m>   ") + chalk.dim("Modeli değiştir (deepseek-chat/deepseek-reasoner)"));
  console.log(chalk.cyan("  /tokens      ") + chalk.dim("Token kullanımını göster"));
  console.log(chalk.cyan("  /config      ") + chalk.dim("Mevcut yapılandırmayı göster"));
  console.log(chalk.cyan("  /exit, /quit ") + chalk.dim("Çıkış yap"));
  console.log();
}

// ─── Token usage display ───────────────────────────────────────────────────
export function printTokenUsage(usage: { input: number; output: number; estimatedCost: string }): void {
  console.log();
  console.log(chalk.dim("  ┌─────────────────────────────────┐"));
  console.log(chalk.dim("  │ ") + chalk.bold("Token Kullanımı") + chalk.dim("                │"));
  console.log(chalk.dim("  ├─────────────────────────────────┤"));
  console.log(chalk.dim("  │ ") + `Giriş:  ${chalk.cyan(usage.input.toLocaleString().padStart(12))} tokens` + chalk.dim(" │"));
  console.log(chalk.dim("  │ ") + `Çıkış:  ${chalk.cyan(usage.output.toLocaleString().padStart(12))} tokens` + chalk.dim(" │"));
  console.log(chalk.dim("  │ ") + `Maliyet: ${chalk.yellow(usage.estimatedCost.padStart(11))}       ` + chalk.dim(" │"));
  console.log(chalk.dim("  └─────────────────────────────────┘"));
  console.log();
}

// ─── Config display ────────────────────────────────────────────────────────
export function printConfig(config: Record<string, any>): void {
  console.log(chalk.bold("\n  Yapılandırma:"));
  for (const [key, value] of Object.entries(config)) {
    if (key === "api_key") {
      const masked = value ? "***" + String(value).slice(-4) : chalk.red("(boş)");
      console.log(chalk.dim(`  ${key}: `) + masked);
    } else if (Array.isArray(value)) {
      console.log(chalk.dim(`  ${key}: `) + chalk.dim(`[${value.length} öğe]`));
    } else {
      console.log(chalk.dim(`  ${key}: `) + chalk.white(String(value)));
    }
  }
  console.log();
}

// ─── Readline input ────────────────────────────────────────────────────────
export function createInputReader() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "",
    terminal: true,
  });

  return {
    async ask(prompt: string): Promise<string> {
      return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
          resolve(answer);
        });
      });
    },
    close() {
      rl.close();
    },
  };
}

// ─── Multiline input support ───────────────────────────────────────────────
export async function getMultilineInput(reader: ReturnType<typeof createInputReader>): Promise<string> {
  const firstLine = await reader.ask(chalk.bold.green("\n  ❯ "));

  if (!firstLine.trim()) return "";

  // Check for multiline trigger (ends with \)
  if (!firstLine.endsWith("\\")) {
    return firstLine;
  }

  const lines = [firstLine.slice(0, -1)];
  while (true) {
    const line = await reader.ask(chalk.dim("  ... "));
    if (!line.endsWith("\\")) {
      lines.push(line);
      break;
    }
    lines.push(line.slice(0, -1));
  }

  return lines.join("\n");
}

// ─── Session list display ──────────────────────────────────────────────────
export function printSessionList(sessions: Array<{ id: string; title: string; updated_at: string; token_usage: { input: number; output: number } }>): void {
  if (sessions.length === 0) {
    console.log(chalk.dim("\n  Kayıtlı oturum bulunamadı.\n"));
    return;
  }

  console.log(chalk.bold("\n  Kayıtlı Oturumlar:\n"));
  for (const s of sessions.slice(0, 20)) {
    const date = new Date(s.updated_at).toLocaleString("tr-TR");
    const tokens = (s.token_usage?.input || 0) + (s.token_usage?.output || 0);
    console.log(
      `  ${chalk.cyan(s.id)} ${chalk.dim("│")} ${s.title.slice(0, 50).padEnd(50)} ${chalk.dim("│")} ${date} ${chalk.dim("│")} ${tokens.toLocaleString()} tok`
    );
  }
  console.log(chalk.dim(`\n  '/load <id>' ile bir oturumu yükleyebilirsiniz.\n`));
}

// ─── Welcome message after setup ───────────────────────────────────────────
export function printWelcome(): void {
  console.log(chalk.dim(`
  Komutlar için ${chalk.cyan("/help")} yazın.
  Çok satırlı giriş için satır sonuna ${chalk.cyan("\\")} ekleyin.
  Çıkmak için ${chalk.cyan("/exit")} veya ${chalk.cyan("Ctrl+C")} kullanın.
`));
}
