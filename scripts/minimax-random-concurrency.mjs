#!/usr/bin/env node

const TEXT_API_URL = "https://api.minimaxi.com/v1/chat/completions";
const SPEECH_API_URL = "https://api.minimaxi.com/v1/t2a_v2";

function parsePositiveInteger(value, flag, { allowZero = false } = {}) {
  const parsed = Number(value);
  const minimum = allowZero ? 0 : 1;
  if (!Number.isInteger(parsed) || parsed < minimum) {
    throw new Error(`${flag} 必须是${allowZero ? "非负" : "正"}整数`);
  }
  return parsed;
}

function parseArgs(argv) {
  const options = {
    rounds: 12,
    intervalMs: 2_000,
    maxConcurrency: 3,
    service: "text",
    model: undefined,
    voiceId: "male-qn-qingse",
    timeoutMs: 30_000,
    forever: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} 缺少参数`);
      index += 1;
      return value;
    };

    if (argument === "--rounds") options.rounds = parsePositiveInteger(next(), argument);
    else if (argument === "--interval-ms") options.intervalMs = parsePositiveInteger(next(), argument, { allowZero: true });
    else if (argument === "--max-concurrency") options.maxConcurrency = parsePositiveInteger(next(), argument);
    else if (argument === "--service") options.service = next();
    else if (argument === "--model") options.model = next();
    else if (argument === "--voice-id") options.voiceId = next();
    else if (argument === "--timeout-ms") options.timeoutMs = parsePositiveInteger(next(), argument);
    else if (argument === "--forever") options.forever = true;
    else if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`未知参数：${argument}`);
  }

  if (!["text", "speech"].includes(options.service)) {
    throw new Error("--service 仅支持 text 或 speech");
  }
  options.model ??= options.service === "text" ? "MiniMax-M2.7" : "speech-2.8-turbo";

  return options;
}

function printHelp() {
  console.log(`MiniMax 0～3 随机并发调用 demo

用法：
  read -s "MINIMAX_API_KEY?MiniMax Key: " && export MINIMAX_API_KEY
  node scripts/minimax-random-concurrency.mjs
  node scripts/minimax-random-concurrency.mjs --rounds 30 --interval-ms 3000

参数：
  --rounds N              运行轮数，默认 12
  --interval-ms N         每轮结束后的等待时间，默认 2000
  --max-concurrency N     随机并发上限，默认 3（即每轮 0～3）
  --service NAME          text（默认，后台可统计）或 speech
  --model NAME            模型；默认 MiniMax-M2.7 或 speech-2.8-turbo
  --voice-id ID           Speech 系统音色，默认 male-qn-qingse
  --timeout-ms N          单请求超时，默认 30000
  --forever               持续运行，直到 Ctrl+C
  --dry-run               不访问 API，只验证随机调度
  -h, --help              显示帮助

说明：0 并发轮次只等待，不发送请求；Speech 音频不落盘。`);
}

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const randomInteger = max => Math.floor(Math.random() * (max + 1));
const timestamp = () => new Date().toLocaleTimeString("zh-CN", { hour12: false });

async function callSpeech({ apiKey, model, voiceId, timeoutMs, round, slot }) {
  const startedAt = performance.now();
  const text = `并发测试，第${round}轮，第${slot}路。`;

  try {
    const response = await fetch(SPEECH_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        text,
        stream: false,
        language_boost: "Chinese",
        output_format: "url",
        voice_setting: {
          voice_id: voiceId,
          speed: 1,
          vol: 1,
          pitch: 0,
        },
        audio_setting: {
          sample_rate: 32_000,
          bitrate: 128_000,
          format: "mp3",
          channel: 1,
        },
        subtitle_enable: false,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const elapsedMs = Math.round(performance.now() - startedAt);
    const body = await response.json().catch(() => ({}));
    const apiStatus = body?.base_resp?.status_code;
    const success = response.ok && apiStatus === 0;

    if (!success) {
      const message = body?.base_resp?.status_msg ?? body?.message ?? `HTTP ${response.status}`;
      console.error(`[${timestamp()}] 第${round}轮/${slot}路 失败 ${elapsedMs}ms HTTP=${response.status} code=${apiStatus ?? "-"} message=${String(message).slice(0, 160)}`);
      return { success: false, elapsedMs, usageAmount: 0 };
    }

    const usageCharacters = body?.extra_info?.usage_characters ?? text.length;
    console.log(`[${timestamp()}] 第${round}轮/${slot}路 成功 ${elapsedMs}ms chars=${usageCharacters} trace=${body?.trace_id ?? "-"}`);
    return { success: true, elapsedMs, usageAmount: usageCharacters };
  } catch (error) {
    const elapsedMs = Math.round(performance.now() - startedAt);
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${timestamp()}] 第${round}轮/${slot}路 异常 ${elapsedMs}ms ${message}`);
    return { success: false, elapsedMs, usageAmount: 0 };
  }
}

async function callText({ apiKey, model, timeoutMs, round, slot }) {
  const startedAt = performance.now();

  try {
    const response = await fetch(TEXT_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a health-check endpoint. Reply with only OK." },
          { role: "user", content: `health check round=${round} slot=${slot}` },
        ],
        max_tokens: 16,
        stream: false,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const elapsedMs = Math.round(performance.now() - startedAt);
    const body = await response.json().catch(() => ({}));
    const apiStatus = body?.base_resp?.status_code;
    const success = response.ok && (apiStatus === undefined || apiStatus === 0);

    if (!success) {
      const message = body?.base_resp?.status_msg ?? body?.error?.message ?? body?.message ?? `HTTP ${response.status}`;
      console.error(`[${timestamp()}] 第${round}轮/${slot}路 失败 ${elapsedMs}ms HTTP=${response.status} code=${apiStatus ?? "-"} message=${String(message).slice(0, 160)}`);
      return { success: false, elapsedMs, usageAmount: 0 };
    }

    const totalTokens = body?.usage?.total_tokens ?? 0;
    console.log(`[${timestamp()}] 第${round}轮/${slot}路 成功 ${elapsedMs}ms tokens=${totalTokens} request=${body?.id ?? "-"}`);
    return { success: true, elapsedMs, usageAmount: totalTokens };
  } catch (error) {
    const elapsedMs = Math.round(performance.now() - startedAt);
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${timestamp()}] 第${round}轮/${slot}路 异常 ${elapsedMs}ms ${message}`);
    return { success: false, elapsedMs, usageAmount: 0 };
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const apiKey = process.env.MINIMAX_API_KEY;
  if (!options.dryRun && !apiKey) {
    throw new Error("缺少 MINIMAX_API_KEY；请通过环境变量传入，不要写进源码");
  }

  console.log(`MiniMax ${options.service} 随机并发 demo：范围 0～${options.maxConcurrency}，${options.forever ? "持续运行" : `${options.rounds} 轮`}，间隔 ${options.intervalMs}ms${options.dryRun ? "（dry-run）" : ""}`);

  let round = 0;
  let totalRequests = 0;
  let totalSuccesses = 0;
  let totalUsage = 0;

  while (options.forever || round < options.rounds) {
    round += 1;
    const concurrency = randomInteger(options.maxConcurrency);
    console.log(`\n[${timestamp()}] 第${round}轮：目标并发 ${concurrency}`);

    if (concurrency > 0 && !options.dryRun) {
      const caller = options.service === "text" ? callText : callSpeech;
      const results = await Promise.all(Array.from(
        { length: concurrency },
        (_, index) => caller({
          apiKey,
          model: options.model,
          voiceId: options.voiceId,
          timeoutMs: options.timeoutMs,
          round,
          slot: index + 1,
        }),
      ));
      totalRequests += results.length;
      totalSuccesses += results.filter(result => result.success).length;
      totalUsage += results.reduce((sum, result) => sum + result.usageAmount, 0);
    } else if (concurrency === 0) {
      console.log(`[${timestamp()}] 第${round}轮：空闲，不发送请求`);
    }

    if ((options.forever || round < options.rounds) && options.intervalMs > 0) {
      await sleep(options.intervalMs);
    }
  }

  const usageLabel = options.service === "text" ? "tokens" : "计费字符";
  console.log(`\n完成：${round} 轮，${totalRequests} 次请求，成功 ${totalSuccesses}，失败 ${totalRequests - totalSuccesses}，${usageLabel} ${totalUsage}`);
  if (!options.dryRun && totalRequests > 0 && totalSuccesses === 0) process.exitCode = 1;
}

main().catch(error => {
  console.error(`启动失败：${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
