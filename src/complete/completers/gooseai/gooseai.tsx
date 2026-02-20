import React from "react";
import type { Completer, Model, Prompt } from "../../complete";
import {
  SettingsUI as ProviderSettingsUI,
  type Settings,
  parse_settings,
} from "./provider_settings";

export default class OpenAIModel implements Model {
  id: string;
  name: string;
  description: string;

  provider_settings: Settings;

  constructor(
    id: string,
    name: string,
    description: string,
    provider_settings: string
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.provider_settings = parse_settings(provider_settings);
  }

  async complete(prompt: Prompt): Promise<string> {
    const res = await fetch(
      `https://api.goose.ai/v1/engines/${this.id}/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.provider_settings.api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.prefix.slice(
            -(this.provider_settings.context_length || 2048)
          ),
        }),
      }
    );
    const response = await res.json();
    if (!res.ok) {
      const msg =
        response?.error?.message ?? response?.message ?? res.statusText;
      throw new Error(`GooseAI API error: ${msg}`);
    }
    return response?.choices?.[0]?.text ?? "";
  }
}

export class GooseAIComplete implements Completer {
  id: string = "gooseai";
  name: string = "GooseAI";
  description = (
    <>
      <a href="https://goose.ai">GooseAI</a> - a fully managed
      NLP-as-a-Service, delivered via API. It is comparable to OpenAI in
      this regard.
    </>
  );

  async get_models(settings: string) {
    const settings_obj = parse_settings(settings);
    const res = await fetch("https://api.goose.ai/v1/engines", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${settings_obj.api_key}`,
      },
    });
    const engines = await res.json();
    if (!res.ok) {
      const msg =
        engines?.error?.message ?? engines?.message ?? res.statusText;
      throw new Error(`GooseAI API: ${msg}`);
    }
    const data = engines?.data;
    if (!Array.isArray(data)) return [];
    return data.map(
      (model: {
        id: string;
        name: string;
        description: string;
        object: string;
        owner: string;
        ready: boolean;
        tokenizer: string;
        type: string;
      }) =>
        new OpenAIModel(model.id, model.name, model.description, settings)
    );
  }

  Settings = ProviderSettingsUI;
}
