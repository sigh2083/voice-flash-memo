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

  private extractText(response: RequestUrlResponse): string {
    const fromJson = this.extractTextFromUnknown(response.json);
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
    const json = response.json;
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

  private tryParseJson(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
