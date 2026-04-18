import { RequestUrlResponse, requestUrl } from "obsidian";

import type { ApiProfile, VoiceFlashSettings } from "./types";

export interface TranscriptionInput {
  audioBuffer: ArrayBuffer;
  fileName: string;
  mimeType: string;
}

export interface TranscriptionResult {
  text: string;
  profile: ApiProfile;
  attemptedProfiles: ApiProfile[];
}

export class TranscriptionService {
  async transcribe(settings: VoiceFlashSettings, input: TranscriptionInput): Promise<TranscriptionResult> {
    const profiles = this.resolveProfiles(settings);
    const attemptedProfiles: ApiProfile[] = [];
    const errors: string[] = [];

    for (const profile of profiles) {
      attemptedProfiles.push(profile);
      try {
        const text =
          profile.provider === "gemini"
            ? await this.transcribeWithGemini(profile, settings, input)
            : await this.transcribeWithOpenAiCompatible(profile, settings, input);
        return {
          text,
          profile,
          attemptedProfiles,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${profile.name}：${message}`);
      }
    }

    throw new Error(this.buildFailureMessage(errors));
  }

  private async transcribeWithOpenAiCompatible(
    profile: ApiProfile,
    settings: VoiceFlashSettings,
    input: TranscriptionInput,
  ): Promise<string> {
    this.validateProfile(profile);
    const endpoint = this.resolveEndpoint(profile.baseUrl);
    const boundary = `----voice-flash-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;

    const body = this.buildMultipartBody(boundary, profile, settings, input);

    const response = await requestUrl({
      url: endpoint,
      method: "POST",
      headers: {
        Authorization: `Bearer ${profile.apiKey.trim()}`,
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
    profile: ApiProfile,
    settings: VoiceFlashSettings,
    input: TranscriptionInput,
  ): Promise<string> {
    this.validateProfile(profile);
    const endpoint = this.resolveGeminiEndpoint(profile);
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

  private resolveProfiles(settings: VoiceFlashSettings): ApiProfile[] {
    const profiles = settings.apiProfiles.filter((profile) => profile.id.trim().length > 0);
    if (profiles.length === 0) {
      if (settings.apiBaseUrl.trim() || settings.apiKey.trim() || settings.model.trim()) {
        return [
          {
            id: "legacy",
            name: "默认 API",
            provider: settings.apiProvider,
            baseUrl: settings.apiBaseUrl.trim(),
            apiKey: settings.apiKey.trim(),
            model: settings.model.trim(),
          },
        ];
      }
      throw new Error("请先在设置中添加至少一个 API。");
    }

    const activeId = settings.activeApiProfileId.trim();
    const activeIndex = profiles.findIndex((profile) => profile.id === activeId);
    if (activeIndex <= 0) {
      return profiles;
    }

    return [profiles[activeIndex], ...profiles.slice(0, activeIndex), ...profiles.slice(activeIndex + 1)];
  }

  private validateProfile(profile: ApiProfile): void {
    if (!profile.baseUrl.trim()) {
      throw new Error("缺少 API Base URL。");
    }
    if (!profile.apiKey.trim()) {
      throw new Error("缺少 API Key。");
    }
    if (!profile.model.trim()) {
      throw new Error("缺少 Model。");
    }
  }

  private resolveGeminiEndpoint(profile: ApiProfile): string {
    const base = profile.baseUrl.trim().replace(/\/+$/g, "");
    const model = profile.model.trim();
    const key = encodeURIComponent(profile.apiKey.trim());
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
    profile: ApiProfile,
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

    pushTextPart("model", profile.model.trim());
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

  private buildFailureMessage(errors: string[]): string {
    if (errors.length === 0) {
      return "转写失败，未能获得可用的 API 响应。";
    }
    if (errors.length === 1) {
      return errors[0];
    }
    return `全部 API 尝试失败：${errors.join("；")}`;
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
