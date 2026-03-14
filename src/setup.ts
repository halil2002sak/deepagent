// ═══════════════════════════════════════════════════════════════════════════
// DeepAgent Setup — First-time configuration & API key setup
// ═══════════════════════════════════════════════════════════════════════════

import chalk from "chalk";
import { createInterface } from "readline";
import OpenAI from "openai";
import { loadConfig, saveConfig, type DeepAgentConfig, CONFIG_DIR } from "./config.js";

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

export async function runSetup(): Promise<DeepAgentConfig> {
  console.log(chalk.bold.cyan("\n  ═══ DeepAgent Kurulumu ═══\n"));
  console.log(chalk.dim("  API anahtarınızı buradan alabilirsiniz:"));
  console.log(chalk.cyan("  https://platform.deepseek.com/api_keys\n"));

  const config = loadConfig();

  // API Key
  const currentKey = config.api_key ? `***${config.api_key.slice(-4)}` : "(boş)";
  console.log(chalk.dim(`  Mevcut anahtar: ${currentKey}`));
  const apiKey = await askLine(chalk.bold("  DeepSeek API Anahtarı: "));

  if (apiKey.trim()) {
    config.api_key = apiKey.trim();
  }

  if (!config.api_key) {
    console.log(chalk.red("\n  ❌ API anahtarı gerekli. Kurulum iptal edildi.\n"));
    process.exit(1);
  }

  // Validate API key
  console.log(chalk.dim("\n  API anahtarı doğrulanıyor..."));
  const isValid = await validateApiKey(config.api_key, config.base_url);
  if (!isValid) {
    console.log(chalk.red("  ❌ Geçersiz API anahtarı. Lütfen kontrol edin.\n"));
    process.exit(1);
  }
  console.log(chalk.green("  ✓ API anahtarı doğrulandı.\n"));

  // Model selection
  console.log(chalk.dim("  Mevcut modeller:"));
  console.log(chalk.dim("  1. deepseek-chat     — Hızlı, düşük maliyet (önerilen)"));
  console.log(chalk.dim("  2. deepseek-reasoner — Akıl yürütme modu, daha yavaş"));
  const modelChoice = await askLine(chalk.bold("  Model seçimi [1]: "));
  if (modelChoice.trim() === "2") {
    config.model = "deepseek-reasoner";
  } else {
    config.model = "deepseek-chat";
  }

  // Permission mode
  console.log(chalk.dim("\n  Güvenlik modları:"));
  console.log(chalk.green("  1. strict   ") + chalk.dim("— Her işlem için onay iste (önerilen)"));
  console.log(chalk.yellow("  2. moderate ") + chalk.dim("— Güvenli işlemleri otomatik onayla"));
  console.log(chalk.red("  3. yolo     ") + chalk.dim("— Tüm işlemleri otomatik onayla (tehlikeli!)"));
  const modeChoice = await askLine(chalk.bold("  Güvenlik modu [1]: "));
  if (modeChoice.trim() === "2") {
    config.permission_mode = "moderate";
  } else if (modeChoice.trim() === "3") {
    config.permission_mode = "yolo";
  } else {
    config.permission_mode = "strict";
  }

  // Save
  saveConfig(config);
  console.log(chalk.green(`\n  ✓ Yapılandırma kaydedildi: ${CONFIG_DIR}/config.json`));
  console.log(chalk.dim(`  ✓ Özel kurallar için: ${CONFIG_DIR}/rules.md\n`));

  return config;
}

async function validateApiKey(apiKey: string, baseUrl: string): Promise<boolean> {
  try {
    const client = new OpenAI({ apiKey, baseURL: baseUrl });
    await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: "test" }],
      max_tokens: 1,
    });
    return true;
  } catch (err: any) {
    if (err.status === 401 || err.code === "invalid_api_key") return false;
    // Other errors (rate limit etc.) mean the key is valid
    return true;
  }
}
