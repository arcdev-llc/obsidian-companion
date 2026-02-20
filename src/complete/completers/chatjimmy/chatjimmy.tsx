import { createInterface } from "readline";
import { requestUrl } from "obsidian";
import { Notice } from "obsidian";

const DEBUG = true;
const log = (...args: unknown[]) => DEBUG && console.log("[ChatJimmy]", ...args);
import type { Completer, Model, Prompt } from "../../complete";
import {
  SettingsUI as ProviderSettingsUI,
  type Settings as ProviderSettings,
  parse_settings as parse_provider_settings,
} from "./provider_settings";
import {
  SettingsUI as ModelSettingsUI,
  parse_settings as parse_model_settings,
  type Settings as ModelSettings,
} from "./model_settings";
import Mustache from "mustache";

export default class ChatJimmyModel implements Model {
  id: string;
  name: string;
  description: string;
  rate_limit_notice: Notice | null = null;
  rate_limit_notice_timeout: number | null = null;
  Settings = ModelSettingsUI;

  provider_settings: ProviderSettings;

  cancel_generations: (() => void)[];

  constructor(
    provider_settings: string,
    id: string,
    name: string,
    description: string
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.provider_settings = parse_provider_settings(provider_settings);
    this.cancel_generations = [];
  }

  async prepare(
    prompt: Prompt,
    settings: ModelSettings
  ): Promise<{
    prefix: string;
    suffix: string;
    last_line: string;
    context: string;
  }> {
    const cropped = {
      prefix: prompt.prefix.slice(-(settings.prompt_length || 6000)),
      suffix: prompt.suffix.slice(0, settings.prompt_length || 6000),
    };
    const last_line = cropped.prefix
      .split("\n")
      .filter((x) => x.length > 0)
      .pop();
    return {
      ...cropped,
      last_line: last_line || "",
      context: cropped.prefix
        .split("\n")
        .filter((x) => x !== last_line)
        .join("\n"),
    };
  }

  async complete(prompt: Prompt, settings: string): Promise<string> {
    const model_settings = parse_model_settings(settings);

    const prepared = await this.prepare(prompt, model_settings);
    const content = Mustache.render(model_settings.user_prompt, prepared);
    const systemPrompt = Mustache.render(model_settings.system_prompt, prepared);

    const response = await requestUrl({
      url: this.provider_settings.endpoint + "/api/chat",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content }],
        chatOptions: {
          selectedModel: this.id,
          systemPrompt,
          topK: 8,
        },
        attachment: null,
      }),
      throw: true,
    });

    const raw = await response.text;
    const accumulated = this.parseStreamResponse(raw);
    return this.interpret(prompt, accumulated);
  }

  parseStreamResponse(raw: string): string {
    const single = (v: unknown): v is { response?: string } =>
      v != null && typeof v === "object";
    try {
      const parsed = JSON.parse(raw);
      if (single(parsed) && typeof parsed.response === "string") {
        return parsed.response;
      }
    } catch {
      /* fall through to stream parse */
    }

    let result = "";
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data: [DONE]") continue;
      const data = trimmed.startsWith("data: ") ? trimmed.slice(6) : trimmed;
      try {
        const obj = JSON.parse(data);
        if (single(obj) && typeof obj.response === "string") {
          result += obj.response;
        }
      } catch {
        /* skip malformed lines */
      }
    }

    if (result.length > 0) return result;
    return raw.trim();
  }

  parseStreamLine(raw: string): { token: string; done: boolean } | null {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "data: [DONE]") return null;
    const data = trimmed.startsWith("data: ") ? trimmed.slice(6) : trimmed;
    try {
      const obj = JSON.parse(data);
      const token =
        obj?.response ??
        obj?.choices?.[0]?.delta?.content ??
        obj?.content ??
        "";
      return { token, done: !!obj?.done };
    } catch {
      return { token: data + "\n", done: false };
    }
  }

  async *iterate(prompt: Prompt, settings: string): AsyncGenerator<string> {
    log("iterate() entry");
    try {
      const model_settings = parse_model_settings(settings);
      log("model_settings parsed");

      for (const cancel_generation of this.cancel_generations) {
        cancel_generation();
      }

      const { remote } = require("electron");
      log("electron.remote obtained");
      const request = remote.net.request({
        url: this.provider_settings.endpoint + "/api/chat",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const prompt_data = await this.prepare(prompt, model_settings);
      const content = Mustache.render(model_settings.user_prompt, prompt_data);
      const systemPrompt = Mustache.render(model_settings.system_prompt, prompt_data);
      log("prompt_data prepared, endpoint:", this.provider_settings.endpoint);
      request.write(
        JSON.stringify({
          messages: [{ role: "user", content }],
          chatOptions: {
            selectedModel: this.id,
            systemPrompt,
            topK: 8,
          },
          attachment: null,
        })
      );

      this.cancel_generations.push(() => request.abort());

      const response = await new Promise<NodeJS.ReadableStream>(
        (resolve, reject) => {
          request.on("response", (res: { statusCode?: number }) => {
            log("response received, status:", res?.statusCode);
            resolve(res as NodeJS.ReadableStream);
          });
          request.on("error", (err: unknown) => {
            log("request error", err);
            reject(err);
          });
          request.end();
        }
      );

      log("creating readline interface, response type:", typeof response);
      const rl = createInterface({
        input: response as NodeJS.ReadableStream,
        crlfDelay: Infinity,
      });

      let initialized = false;
      let generated = "";
      let started = false;
      let lineCount = 0;
      log("entering for-await loop");
      try {
        for await (const line of rl) {
          lineCount++;
          if (lineCount <= 3) log("line", lineCount, "raw:", JSON.stringify(line));
          const parsed = this.parseStreamLine(line);
          if (!parsed) {
            if (lineCount <= 5) log("line skipped (null parse)");
            continue;
          }
          const { token: rawToken, done } = parsed;
          if (done) break;

          let token = rawToken;
          generated += token;

          if (prompt_data.last_line.includes(generated)) continue;

          if (!started) {
            for (let i = generated.length - 1; i >= 0; i--) {
              if (prompt_data.last_line.endsWith(generated.slice(0, i))) {
                token = generated.slice(i);
                started = true;
                break;
              }
            }
          }

          if (!token) continue;

          if (lineCount <= 5) log("yielding token:", JSON.stringify(token));
          if (!initialized) {
            yield this.interpret(prompt, token);
            initialized = true;
          } else {
            yield token;
          }
        }
        log("loop exited normally, lines processed:", lineCount);
      } finally {
        this.cancel_generations = this.cancel_generations.filter(
          (x) => x !== request.abort
        );
      }
    } catch (err) {
      log("iterate() caught error", err);
      const full = await this.complete(prompt, settings);
      log("fallback complete() returned:", full ? `${full.length} chars` : "empty");
      if (full) yield full;
    }
  }

  interpret(prompt: Prompt, completion: string) {
    const response_punctuation = " \n.,?!:;";
    const prompt_punctuation = " \n";

    if (
      prompt.prefix.length !== 0 &&
      !prompt_punctuation.includes(
        prompt.prefix[prompt.prefix.length - 1]
      ) &&
      !response_punctuation.includes(completion[0])
    ) {
      completion = " " + completion;
    }

    return completion;
  }
}

export class ChatJimmyComplete implements Completer {
  id: string = "chatjimmy";
  name: string = "ChatJimmy";
  description: string = "ChatJimmy's API, for text generation";

  async get_models(settings: string) {
    const provider_settings = parse_provider_settings(settings);
    const response = await requestUrl({
      url: `${provider_settings.endpoint}/api/models`,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      throw: true,
    }).then((r) => r.json);

    return response.data.map((model: { id: string }) =>
      new ChatJimmyModel(settings, model.id, model.id, model.id)
    );
  }

  Settings = ProviderSettingsUI;
}
