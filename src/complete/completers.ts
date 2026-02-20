import type { Completer } from "./complete";
import { OpenAIComplete } from "./completers/openai/openai";
import { ChatGPTComplete } from "./completers/chatgpt/chatgpt";
import { OllamaComplete } from "./completers/ollama/ollama";
import { ChatJimmyComplete } from './completers/chatjimmy/chatjimmy';

export const available: Completer[] = [
	new ChatGPTComplete(),
	new OpenAIComplete(),
	new OllamaComplete(),
	new ChatJimmyComplete()
];
