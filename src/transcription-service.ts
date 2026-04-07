import { RequestUrlResponse, requestUrl } from "obsidian";

import type { VoiceFlashSettings } from "./types";

export interface TranscriptionInput {
  audioBuffer: ArrayBuffer;
  fileName: string;
  mimeType: string;
}

export class TranscriptionService {
  async transcribe(settings: VoiceFlashSettings, input: TranscriptionInput): Promise<string> {
    this.validateSettings(settings);

    if (settings.apiProvider === "gemini") {
      return this.transcribeWithGemini(settings, input);
    }

    return this.transcribeWithOpenAiCompatible(settings, input);
  }

  private async transcribeWithOpenAiCompatible(
    settings: VoiceFlashSettings,
    input: TranscriptionInput,
  ): Promise<string> {
    const endpoint = this.resolveEndpoint(settings.apiBaseUrl);
    const boundary = `----voice-flash-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;

    const body = this.buildMultipartBody(boundary, settings, input);

    const response = await requestUrl({
      url: endpoint,
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.apiKey.trim()}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body,
      throw: false,
    });

    if (response.status >= 400) {
      throw new Error(this.extractError(response));
    }

    const text = this.extractText(response);
    if (!text) {
      throw new Error("转写接口返回为空。请检查模型与接口兼容性。");
    }

    return text;
  }

  private async transcribeWithGemini(
    settings: VoiceFlashSettings,
    input: TranscriptionInput,
  ): Promise<string> {
    const endpoint = this.resolveGeminiEndpoint(settings);
    const payload = {
      contents: [
        {
          parts: [
            { text: settings.prompt.trim() || "请尽量忠实转写，整理口语、断句和标点。" },
            {
              inline_data: {
                mime_type: input.mimeType || "audio/mp4",
                data: this.arrayBufferToBase64(input.audioBuffer),
              },
            },
          ],
        },
      ],
    };

    const response = await requestUrl({
      url: endpoint,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      throw: false,
    });

    if (response.status >= 400) {
      throw new Error(this.extractError(response));
    }

    const json = this.safeGetJson(response);
    const text = this.extractGeminiText(json ?? this.tryParseJson(response.text ?? ""));
    if (!text) {
      throw new Error("Gemini 返回为空。请检查模型、权限或音频格式。");
    }

    return text;
  }

  private validateSettings(settings: VoiceFlashSettings): void {
    if (!settings.apiBaseUrl.trim()) {
      throw new Error("请先在设置中填写 API Base URL。");
    }
    if (!settings.apiKey.trim()) {
      throw new Error("请先在设置中填写 API Key。");
    }
    if (!settings.model.trim()) {
      throw new Error("请先在设置中填写 Model。");
    }
  }

  private resolveGeminiEndpoint(settings: VoiceFlashSettings): string {
    const base = settings.apiBaseUrl.trim().replace(/\/+$/g, "");
    const model = settings.model.trim();
    const key = encodeURIComponent(settings.apiKey.trim());
    return `${base}/models/${encodeURIComponent(model)}:generateContent?key=${key}`;
  }

  private resolveEndpoint(baseUrl: string): string {
    const trimmed = baseUrl.trim().replace(/\/+$/g, "");
    if (trimmed.endsWith("/audio/transcriptions")) {
      return trimmed;
    }
    return `${trimmed}/audio/transcriptions`;
  }

  private buildMultipartBody(
    boundary: string,
    settings: VoiceFlashSettings,
    input: TranscriptionInput,
  ): ArrayBuffer {
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];

    const pushTextPart = (name: string, value: string): void => {
      chunks.push(
        encoder.encode(
          `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="${name}"\r\n\r\n` +
            `${value}\r\n`,
        ),
      );
    };

    pushTextPart("model", settings.model.trim());
    if (settings.prompt.trim()) {
      pushTextPart("prompt", settings.prompt.trim());
    }
    pushTextPart("response_format", "json");

    chunks.push(
      encoder.encode(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="file"; filename="${input.fileName}"\r\n` +
          `Content-Type: ${input.mimeType || "application/octet-stream"}\r\n\r\n`,
      ),
    );
    chunks.push(new Uint8Array(input.audioBuffer));
    chunks.push(encoder.encode("\r\n"));

    chunks.push(encoder.encode(`--${boundary}--\r\n`));

    const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const merged = new Uint8Array(total);

    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return merged.buffer;
  }

  private extractGeminiText(value: unknown): string {
    if (!value || typeof value !== "object") {
      return "";
    }

    const root = value as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
          }>;
        };
      }>;
    };

    const candidates = root.candidates ?? [];
    for (const candidate of candidates) {
      const parts = candidate.content?.parts ?? [];
      const texts = parts
        .map((part) => (typeof part.text === "string" ? part.text.trim() : ""))
        .filter((text) => text.length > 0);

      if (texts.length > 0) {
        return texts.join("\n");
      }
    }

    return "";
  }

  private extractText(response: RequestUrlResponse): string {
    const fromJson = this.extractTextFromUnknown(this.safeGetJson(response));
    if (fromJson) {
      return fromJson;
    }

    const rawText = response.text?.trim();
    if (!rawText) {
      return "";
    }

    const parsed = this.tryParseJson(rawText);
    if (parsed) {
      return this.extractTextFromUnknown(parsed);
    }

    return rawText;
  }

  private extractError(response: RequestUrlResponse): string {
    const json = this.safeGetJson(response);
    if (json && typeof json === "object") {
      const message = (json as { error?: { message?: string } }).error?.message;
      if (message) {
        return `转写失败（${response.status}）：${message}`;
      }
    }

    const text = response.text?.trim();
    if (text) {
      return `转写失败（${response.status}）：${text}`;
    }

    return `转写失败（${response.status}）。`;
  }

  private extractTextFromUnknown(value: unknown): string {
    if (typeof value === "string") {
      return value.trim();
    }

    if (!value || typeof value !== "object") {
      return "";
    }

    const candidate = value as { text?: unknown };
    if (typeof candidate.text === "string") {
      return candidate.text.trim();
    }

    return "";
  }

  private safeGetJson(response: RequestUrlResponse): unknown {
    try {
      return response.json;
    } catch {
      return null;
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
  }

  private tryParseJson(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
