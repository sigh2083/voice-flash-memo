"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => VoiceFlashMemoPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian8 = require("obsidian");

// src/existing-audio-picker-modal.ts
var import_obsidian = require("obsidian");
var ExistingAudioPickerModal = class extends import_obsidian.FuzzySuggestModal {
  constructor(app, audioFiles) {
    super(app);
    this.audioFiles = audioFiles;
    this.resolved = false;
    this.resultPromise = new Promise((resolve) => {
      this.resolveSelection = resolve;
    });
    this.setPlaceholder("\u9009\u62E9\u4E00\u4E2A\u5DF2\u6709\u5F55\u97F3\u7EE7\u7EED\u8F6C\u5199...");
  }
  openAndWait() {
    this.open();
    return this.resultPromise;
  }
  getItems() {
    return this.audioFiles;
  }
  getItemText(file) {
    return file.path;
  }
  renderSuggestion(file, el) {
    el.createDiv({ text: file.basename, cls: "voice-flash-picker-title" });
    el.createDiv({ text: file.path, cls: "voice-flash-picker-path" });
  }
  onChooseItem(file) {
    this.resolved = true;
    this.resolveSelection(file);
    this.resolveSelection = () => void 0;
  }
  onClose() {
    super.onClose();
    if (!this.resolved && this.resolveSelection) {
      this.resolveSelection(null);
      this.resolveSelection = () => void 0;
    }
  }
};

// src/existing-audio-transcription-modal.ts
var import_obsidian5 = require("obsidian");

// src/note-writer.ts
var import_obsidian2 = require("obsidian");

// src/time.ts
var pad = (n) => n.toString().padStart(2, "0");
var formatTimer = (durationMs) => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1e3));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${pad(minutes)}:${pad(seconds)}`;
};
var formatFileTimestamp = (date) => {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());
  return `${year}-${month}-${day}_${hour}-${minute}-${second}`;
};
var formatOffset = (date) => {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hour = pad(Math.floor(abs / 60));
  const minute = pad(abs % 60);
  return `${sign}${hour}:${minute}`;
};
var formatEditedTimestamp = (date) => {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hour}:${minute}:${second} ${formatOffset(date)}`;
};

// src/note-writer.ts
var ensureFolderExists = async (app, folderPath) => {
  const normalized = (0, import_obsidian2.normalizePath)(folderPath).replace(/^\/+|\/+$/g, "");
  if (!normalized) {
    return;
  }
  const segments = normalized.split("/").filter(Boolean);
  let current = "";
  for (const segment of segments) {
    current = current ? `${current}/${segment}` : segment;
    const existing = app.vault.getAbstractFileByPath(current);
    if (existing instanceof import_obsidian2.TFile) {
      throw new Error(`\u8DEF\u5F84 ${current} \u5DF2\u5B58\u5728\u540C\u540D\u6587\u4EF6\uFF0C\u65E0\u6CD5\u521B\u5EFA\u6587\u4EF6\u5939\u3002`);
    }
    if (!existing) {
      await app.vault.createFolder(current);
    }
  }
};
var ensureParentFolder = async (app, fullPath) => {
  const normalized = (0, import_obsidian2.normalizePath)(fullPath);
  const slash = normalized.lastIndexOf("/");
  if (slash <= 0) {
    return;
  }
  const folder = normalized.slice(0, slash);
  await ensureFolderExists(app, folder);
};
var ensureMarkdownPath = (path) => {
  const normalized = (0, import_obsidian2.normalizePath)((path.trim() || "drafts.md").replace(/^\/+/, ""));
  return normalized.toLowerCase().endsWith(".md") ? normalized : `${normalized}.md`;
};
var buildFilePath = (folder, extension, baseName, index) => {
  const suffix = index === 0 ? "" : `_${index}`;
  const fileName = `${baseName}${suffix}.${extension}`;
  return (0, import_obsidian2.normalizePath)(`${folder}/${fileName}`);
};
var isAlreadyExistsError = (error) => {
  const message = error instanceof Error ? error.message : String(error);
  return /already exists/i.test(message);
};
var delay = async (ms) => new Promise((resolve) => {
  window.setTimeout(resolve, ms);
});
var findFileByPathLoose = (app, targetPath) => {
  const direct = app.vault.getFileByPath(targetPath);
  if (direct) {
    return direct;
  }
  const normalizedLower = (0, import_obsidian2.normalizePath)(targetPath).toLowerCase();
  for (const file of app.vault.getFiles()) {
    if ((0, import_obsidian2.normalizePath)(file.path).toLowerCase() === normalizedLower) {
      return file;
    }
  }
  return null;
};
var saveAudioToVault = async (app, settings, blob, extension) => {
  const targetFolder = (0, import_obsidian2.normalizePath)(settings.attachmentDir.trim() || "attachments");
  await ensureFolderExists(app, targetFolder);
  const bytes = await blob.arrayBuffer();
  const baseName = formatFileTimestamp(/* @__PURE__ */ new Date());
  for (let index = 0; index < 200; index += 1) {
    const filePath = buildFilePath(targetFolder, extension, baseName, index);
    try {
      await app.vault.createBinary(filePath, bytes);
      return {
        path: filePath,
        fileName: filePath.split("/").pop() ?? filePath
      };
    } catch (error) {
      if (isAlreadyExistsError(error)) {
        continue;
      }
      throw error;
    }
  }
  throw new Error("\u5F55\u97F3\u6587\u4EF6\u540D\u8FDE\u7EED\u51B2\u7A81\uFF0C\u4FDD\u5B58\u5931\u8D25\u3002\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002");
};
var buildEntry = (settings, audioPath, transcription) => {
  const lines = [];
  const editedLine = `<!-- edited: ${formatEditedTimestamp(/* @__PURE__ */ new Date())} -->`;
  lines.push(transcription.trim());
  if (settings.insertAudioLink) {
    lines.push("");
    if (settings.audioLinkStyle === "hidden-comment") {
      lines.push(`<!-- audio: [[${audioPath}]] -->`);
      lines.push(editedLine);
    } else if (settings.audioLinkStyle === "edit-only") {
      lines.push(`> [!recording]-`);
      lines.push(`> ![[${audioPath}]]`);
      lines.push(`> ${editedLine}`);
    } else if (settings.audioLinkStyle === "embed") {
      lines.push(`![[${audioPath}]]`);
      lines.push("");
      lines.push(editedLine);
    } else {
      lines.push(`[[${audioPath}]]`);
      lines.push("");
      lines.push(editedLine);
    }
  } else {
    lines.push("");
    lines.push(editedLine);
  }
  return `${lines.join("\n")}
`;
};
var appendTranscriptionEntry = async (app, settings, audioPath, transcription) => {
  const cleaned = transcription.trim();
  if (!cleaned) {
    throw new Error("\u8F6C\u5199\u7ED3\u679C\u4E3A\u7A7A\uFF0C\u5DF2\u53D6\u6D88\u5199\u5165\u3002");
  }
  const targetPath = ensureMarkdownPath(settings.defaultNoteFile);
  await ensureParentFolder(app, targetPath);
  const entry = buildEntry(settings, audioPath, cleaned);
  const abstract = app.vault.getAbstractFileByPath(targetPath);
  if (abstract && !(abstract instanceof import_obsidian2.TFile)) {
    throw new Error(`\u9ED8\u8BA4\u5199\u5165\u76EE\u6807 ${targetPath} \u4E0D\u662F\u6587\u4EF6\uFF0C\u8BF7\u4FEE\u6539\u8BBE\u7F6E\u3002`);
  }
  let file = findFileByPathLoose(app, targetPath);
  if (!file) {
    try {
      file = await app.vault.create(targetPath, entry);
      return;
    } catch (error) {
      if (!isAlreadyExistsError(error)) {
        throw error;
      }
    }
    for (let i = 0; i < 8; i += 1) {
      file = findFileByPathLoose(app, targetPath);
      if (file) {
        break;
      }
      await delay(80);
    }
  }
  if (!file) {
    throw new Error(`\u68C0\u6D4B\u5230 ${targetPath} \u5199\u5165\u72B6\u6001\u4E0D\u7A33\u5B9A\uFF0C\u5DF2\u4E2D\u6B62\u4EE5\u9632\u8986\u76D6\uFF0C\u8BF7\u91CD\u8BD5\u3002`);
  }
  await app.vault.process(file, (oldContent) => {
    const prefix = oldContent.length > 0 ? "\n" : "";
    return `${oldContent}${prefix}${entry}`;
  });
};

// src/transcription-buffer-modal.ts
var import_obsidian3 = require("obsidian");
var TranscriptionBufferModal = class extends import_obsidian3.Modal {
  constructor(app, initialText, autoCommitMs) {
    super(app);
    this.initialText = initialText;
    this.autoCommitMs = autoCommitMs;
    this.autoTimer = null;
    this.resolved = false;
    this.editingStarted = false;
    this.resultPromise = new Promise((resolve) => {
      this.resolveResult = resolve;
    });
  }
  openAndWait() {
    this.open();
    return this.resultPromise;
  }
  onOpen() {
    this.modalEl.addClass("voice-flash-buffer-modal");
    const { contentEl } = this;
    contentEl.empty();
    const wrapper = contentEl.createDiv({ cls: "voice-flash-buffer-card" });
    wrapper.createEl("h3", { text: "\u786E\u8BA4\u8F6C\u5199\u5185\u5BB9" });
    this.textareaEl = wrapper.createEl("textarea", { cls: "voice-flash-buffer-input" });
    this.textareaEl.value = this.initialText;
    this.hintEl = wrapper.createDiv({
      cls: "voice-flash-buffer-hint",
      text: `${Math.floor(this.autoCommitMs / 1e3)} \u79D2\u540E\u81EA\u52A8\u5199\u5165\uFF0C\u53EF\u70B9 OK \u7ACB\u5373\u5199\u5165\u3002`
    });
    const actions = wrapper.createDiv({ cls: "voice-flash-buffer-actions" });
    const okButton = actions.createEl("button", { cls: "mod-cta", text: "OK" });
    okButton.addEventListener("click", () => {
      this.commitAndClose();
    });
    this.textareaEl.focus();
    this.textareaEl.setSelectionRange(this.textareaEl.value.length, this.textareaEl.value.length);
    this.bindEditingSignals();
    this.scheduleAutoCommit();
  }
  onClose() {
    if (this.autoTimer !== null) {
      window.clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }
    this.modalEl.removeClass("voice-flash-buffer-modal");
    if (!this.resolved) {
      this.resolved = true;
      this.resolveResult(this.textareaEl?.value ?? this.initialText);
    }
    this.contentEl.empty();
  }
  commitAndClose() {
    if (this.resolved) {
      return;
    }
    this.resolved = true;
    this.resolveResult(this.textareaEl.value);
    this.close();
  }
  bindEditingSignals() {
    const beginEditing = () => {
      if (!this.editingStarted) {
        this.editingStarted = true;
        this.hintEl.setText("\u68C0\u6D4B\u5230\u4F60\u6B63\u5728\u7F16\u8F91\uFF0C\u5DF2\u6682\u505C\u81EA\u52A8\u5199\u5165\u3002\u70B9\u51FB OK \u63D0\u4EA4\u3002");
      }
      this.clearAutoTimer();
    };
    this.textareaEl.addEventListener("focus", () => {
      beginEditing();
    });
    this.textareaEl.addEventListener("input", () => {
      beginEditing();
    });
    this.textareaEl.addEventListener("keydown", () => {
      beginEditing();
    });
    this.textareaEl.addEventListener("blur", () => {
      if (this.resolved) {
        return;
      }
      if (this.editingStarted) {
        this.hintEl.setText(
          `\u4F60\u5DF2\u79BB\u5F00\u7F16\u8F91\u6846\uFF0C\u82E5 ${Math.floor(this.autoCommitMs / 1e3)} \u79D2\u5185\u65E0\u64CD\u4F5C\u5C06\u81EA\u52A8\u5199\u5165\u3002`
        );
      }
      this.scheduleAutoCommit();
    });
  }
  scheduleAutoCommit() {
    this.clearAutoTimer();
    this.autoTimer = window.setTimeout(() => {
      this.commitAndClose();
    }, this.autoCommitMs);
  }
  clearAutoTimer() {
    if (this.autoTimer !== null) {
      window.clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }
  }
};

// src/transcription-service.ts
var import_obsidian4 = require("obsidian");
var TranscriptionService = class {
  async transcribe(settings, input) {
    const profiles = this.resolveProfiles(settings);
    const attemptedProfiles = [];
    const errors = [];
    for (const profile of profiles) {
      attemptedProfiles.push(profile);
      try {
        const text = profile.provider === "gemini" ? await this.transcribeWithGemini(profile, settings, input) : await this.transcribeWithOpenAiCompatible(profile, settings, input);
        return {
          text,
          profile,
          attemptedProfiles
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${profile.name}\uFF1A${message}`);
      }
    }
    throw new Error(this.buildFailureMessage(errors));
  }
  async transcribeWithOpenAiCompatible(profile, settings, input) {
    this.validateProfile(profile);
    const endpoint = this.resolveEndpoint(profile.baseUrl);
    const boundary = `----voice-flash-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
    const body = this.buildMultipartBody(boundary, profile, settings, input);
    const response = await (0, import_obsidian4.requestUrl)({
      url: endpoint,
      method: "POST",
      headers: {
        Authorization: `Bearer ${profile.apiKey.trim()}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`
      },
      body,
      throw: false
    });
    if (response.status >= 400) {
      throw new Error(this.extractError(response));
    }
    const text = this.extractText(response);
    if (!text) {
      throw new Error("\u8F6C\u5199\u63A5\u53E3\u8FD4\u56DE\u4E3A\u7A7A\u3002\u8BF7\u68C0\u67E5\u6A21\u578B\u4E0E\u63A5\u53E3\u517C\u5BB9\u6027\u3002");
    }
    return text;
  }
  async transcribeWithGemini(profile, settings, input) {
    this.validateProfile(profile);
    const endpoint = this.resolveGeminiEndpoint(profile);
    const payload = {
      contents: [
        {
          parts: [
            { text: settings.prompt.trim() || "\u8BF7\u5C3D\u91CF\u5FE0\u5B9E\u8F6C\u5199\uFF0C\u6574\u7406\u53E3\u8BED\u3001\u65AD\u53E5\u548C\u6807\u70B9\u3002" },
            {
              inline_data: {
                mime_type: input.mimeType || "audio/mp4",
                data: this.arrayBufferToBase64(input.audioBuffer)
              }
            }
          ]
        }
      ]
    };
    const response = await (0, import_obsidian4.requestUrl)({
      url: endpoint,
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      throw: false
    });
    if (response.status >= 400) {
      throw new Error(this.extractError(response));
    }
    const json = this.safeGetJson(response);
    const text = this.extractGeminiText(json ?? this.tryParseJson(response.text ?? ""));
    if (!text) {
      throw new Error("Gemini \u8FD4\u56DE\u4E3A\u7A7A\u3002\u8BF7\u68C0\u67E5\u6A21\u578B\u3001\u6743\u9650\u6216\u97F3\u9891\u683C\u5F0F\u3002");
    }
    return text;
  }
  resolveProfiles(settings) {
    const profiles = settings.apiProfiles.filter((profile) => profile.id.trim().length > 0);
    if (profiles.length === 0) {
      if (settings.apiBaseUrl.trim() || settings.apiKey.trim() || settings.model.trim()) {
        return [
          {
            id: "legacy",
            name: "\u9ED8\u8BA4 API",
            provider: settings.apiProvider,
            baseUrl: settings.apiBaseUrl.trim(),
            apiKey: settings.apiKey.trim(),
            model: settings.model.trim()
          }
        ];
      }
      throw new Error("\u8BF7\u5148\u5728\u8BBE\u7F6E\u4E2D\u6DFB\u52A0\u81F3\u5C11\u4E00\u4E2A API\u3002");
    }
    const activeId = settings.activeApiProfileId.trim();
    const activeIndex = profiles.findIndex((profile) => profile.id === activeId);
    if (activeIndex <= 0) {
      return profiles;
    }
    return [profiles[activeIndex], ...profiles.slice(0, activeIndex), ...profiles.slice(activeIndex + 1)];
  }
  validateProfile(profile) {
    if (!profile.baseUrl.trim()) {
      throw new Error("\u7F3A\u5C11 API Base URL\u3002");
    }
    if (!profile.apiKey.trim()) {
      throw new Error("\u7F3A\u5C11 API Key\u3002");
    }
    if (!profile.model.trim()) {
      throw new Error("\u7F3A\u5C11 Model\u3002");
    }
  }
  resolveGeminiEndpoint(profile) {
    const base = profile.baseUrl.trim().replace(/\/+$/g, "");
    const model = profile.model.trim();
    const key = encodeURIComponent(profile.apiKey.trim());
    return `${base}/models/${encodeURIComponent(model)}:generateContent?key=${key}`;
  }
  resolveEndpoint(baseUrl) {
    const trimmed = baseUrl.trim().replace(/\/+$/g, "");
    if (trimmed.endsWith("/audio/transcriptions")) {
      return trimmed;
    }
    return `${trimmed}/audio/transcriptions`;
  }
  buildMultipartBody(boundary, profile, settings, input) {
    const encoder = new TextEncoder();
    const chunks = [];
    const pushTextPart = (name, value) => {
      chunks.push(
        encoder.encode(
          `--${boundary}\r
Content-Disposition: form-data; name="${name}"\r
\r
${value}\r
`
        )
      );
    };
    pushTextPart("model", profile.model.trim());
    if (settings.prompt.trim()) {
      pushTextPart("prompt", settings.prompt.trim());
    }
    pushTextPart("response_format", "json");
    chunks.push(
      encoder.encode(
        `--${boundary}\r
Content-Disposition: form-data; name="file"; filename="${input.fileName}"\r
Content-Type: ${input.mimeType || "application/octet-stream"}\r
\r
`
      )
    );
    chunks.push(new Uint8Array(input.audioBuffer));
    chunks.push(encoder.encode("\r\n"));
    chunks.push(encoder.encode(`--${boundary}--\r
`));
    const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return merged.buffer;
  }
  extractGeminiText(value) {
    if (!value || typeof value !== "object") {
      return "";
    }
    const root = value;
    const candidates = root.candidates ?? [];
    for (const candidate of candidates) {
      const parts = candidate.content?.parts ?? [];
      const texts = parts.map((part) => typeof part.text === "string" ? part.text.trim() : "").filter((text) => text.length > 0);
      if (texts.length > 0) {
        return texts.join("\n");
      }
    }
    return "";
  }
  extractText(response) {
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
  buildFailureMessage(errors) {
    if (errors.length === 0) {
      return "\u8F6C\u5199\u5931\u8D25\uFF0C\u672A\u80FD\u83B7\u5F97\u53EF\u7528\u7684 API \u54CD\u5E94\u3002";
    }
    if (errors.length === 1) {
      return errors[0];
    }
    return `\u5168\u90E8 API \u5C1D\u8BD5\u5931\u8D25\uFF1A${errors.join("\uFF1B")}`;
  }
  extractError(response) {
    const json = this.safeGetJson(response);
    if (json && typeof json === "object") {
      const message = json.error?.message;
      if (message) {
        return `\u8F6C\u5199\u5931\u8D25\uFF08${response.status}\uFF09\uFF1A${message}`;
      }
    }
    const text = response.text?.trim();
    if (text) {
      return `\u8F6C\u5199\u5931\u8D25\uFF08${response.status}\uFF09\uFF1A${text}`;
    }
    return `\u8F6C\u5199\u5931\u8D25\uFF08${response.status}\uFF09\u3002`;
  }
  extractTextFromUnknown(value) {
    if (typeof value === "string") {
      return value.trim();
    }
    if (!value || typeof value !== "object") {
      return "";
    }
    const candidate = value;
    if (typeof candidate.text === "string") {
      return candidate.text.trim();
    }
    return "";
  }
  safeGetJson(response) {
    try {
      return response.json;
    } catch {
      return null;
    }
  }
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 32768;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }
  tryParseJson(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
};

// src/existing-audio-transcription-modal.ts
var AUDIO_MIME_TYPES = {
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  webm: "audio/webm",
  mp4: "audio/mp4",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  aac: "audio/aac",
  flac: "audio/flac",
  caf: "audio/x-caf"
};
var ExistingAudioTranscriptionModal = class extends import_obsidian5.Modal {
  constructor(app, plugin, audioFile) {
    super(app);
    this.plugin = plugin;
    this.audioFile = audioFile;
    this.disposed = false;
    this.transcriptionService = new TranscriptionService();
  }
  onOpen() {
    this.disposed = false;
    this.modalEl.addClass("voice-flash-modal");
    this.buildUi();
    void this.processExistingAudio();
  }
  onClose() {
    this.disposed = true;
    this.modalEl.removeClass("voice-flash-modal");
    this.contentEl.empty();
  }
  buildUi() {
    this.contentEl.empty();
    const wrapper = this.contentEl.createDiv({ cls: "voice-flash-card" });
    wrapper.createEl("h3", { text: "\u8865\u8F6C\u5199\u5DF2\u6709\u5F55\u97F3" });
    this.stateEl = wrapper.createDiv({ cls: "voice-flash-state", text: "\u51C6\u5907\u4E2D..." });
    wrapper.createDiv({ cls: "voice-flash-existing-file", text: this.audioFile.path });
    this.closeButton = wrapper.createEl("button", {
      cls: "voice-flash-stop-btn",
      text: "\u5173\u95ED"
    });
    this.closeButton.addEventListener("click", () => this.close());
    const footer = wrapper.createDiv({ cls: "voice-flash-footer" });
    this.flowStatusEl = footer.createDiv({ cls: "voice-flash-flow", text: "\u6B63\u5728\u8BFB\u53D6\u97F3\u9891\u6587\u4EF6..." });
  }
  async processExistingAudio() {
    this.stateEl.setText("\u5904\u7406\u4E2D");
    try {
      const buffer = await this.app.vault.readBinary(this.audioFile);
      this.setFlowStatus("\u6B63\u5728\u8C03\u7528 AI \u8F6C\u5199...");
      const result = await this.transcriptionService.transcribe(this.plugin.settings, {
        audioBuffer: buffer,
        fileName: this.audioFile.name,
        mimeType: this.resolveMimeType(this.audioFile)
      });
      const fallbackCount = Math.max(0, result.attemptedProfiles.length - 1);
      if (fallbackCount > 0) {
        this.setFlowStatus(`\u5DF2\u81EA\u52A8\u5207\u6362\u5230 ${result.profile.name}\uFF0C\u8F6C\u5199\u5B8C\u6210\uFF0C\u7B49\u5F85\u786E\u8BA4\uFF085 \u79D2\u540E\u81EA\u52A8\u5199\u5165\uFF09...`);
      } else {
        this.setFlowStatus(`\u8F6C\u5199\u5B8C\u6210\uFF08${result.profile.name}\uFF09\uFF0C\u7B49\u5F85\u786E\u8BA4\uFF085 \u79D2\u540E\u81EA\u52A8\u5199\u5165\uFF09...`);
      }
      const finalTranscription = await new TranscriptionBufferModal(this.app, result.text, 5e3).openAndWait();
      this.setFlowStatus("\u6B63\u5728\u5199\u5165\u76EE\u6807\u7B14\u8BB0...");
      await appendTranscriptionEntry(
        this.app,
        this.plugin.settings,
        (0, import_obsidian5.normalizePath)(this.audioFile.path),
        finalTranscription
      );
      this.stateEl.setText("\u5DF2\u5B8C\u6210");
      this.setFlowStatus("\u5DF2\u6210\u529F\u5199\u5165\u3002\u5373\u5C06\u5173\u95ED\u7A97\u53E3...");
      new import_obsidian5.Notice("\u65E7\u5F55\u97F3\u5DF2\u6210\u529F\u8865\u8F6C\u5199\u5E76\u5199\u5165\u76EE\u6807\u7B14\u8BB0\u3002", 3500);
      window.setTimeout(() => {
        if (!this.disposed) {
          this.close();
        }
      }, 500);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.stateEl.setText("\u5931\u8D25");
      this.setFlowStatus(message);
      new import_obsidian5.Notice(`\u8865\u8F6C\u5199\u5931\u8D25\uFF1A${message}`, 7e3);
    }
  }
  resolveMimeType(file) {
    const extension = file.extension.toLowerCase();
    return AUDIO_MIME_TYPES[extension] ?? "application/octet-stream";
  }
  setFlowStatus(message) {
    this.flowStatusEl.setText(message);
  }
};

// src/recording-modal.ts
var import_obsidian6 = require("obsidian");

// src/recording-service.ts
var MIME_CANDIDATES = [
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg"
];
var pickMimeType = () => {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }
  for (const candidate of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return "";
};
var guessExtension = (mimeType) => {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes("mp4") || normalized.includes("m4a")) {
    return "m4a";
  }
  if (normalized.includes("webm")) {
    return "webm";
  }
  if (normalized.includes("ogg")) {
    return "ogg";
  }
  return "m4a";
};
var RecordingController = class _RecordingController {
  constructor(mediaRecorder, stream, mimeType, extension) {
    this.mediaRecorder = mediaRecorder;
    this.stream = stream;
    this.mimeType = mimeType;
    this.extension = extension;
    this.chunks = [];
    this.startedAt = Date.now();
    this.stopRequested = false;
    this.finished = false;
    this.stopPromise = new Promise((resolve, reject) => {
      this.resolveStop = resolve;
      this.rejectStop = reject;
    });
    this.bindRecorderEvents();
    this.mediaRecorder.start();
  }
  static async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301\u5F55\u97F3 API\u3002");
    }
    if (typeof MediaRecorder === "undefined") {
      throw new Error("\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301 MediaRecorder\u3002");
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const pickedMimeType = pickMimeType();
    const recorderOptions = pickedMimeType ? { mimeType: pickedMimeType } : void 0;
    const recorder = new MediaRecorder(stream, recorderOptions);
    const resolvedMimeType = recorder.mimeType || pickedMimeType || "audio/mp4";
    const extension = guessExtension(resolvedMimeType);
    return new _RecordingController(recorder, stream, resolvedMimeType, extension);
  }
  async stop() {
    if (!this.stopRequested) {
      this.stopRequested = true;
      if (this.mediaRecorder.state !== "inactive") {
        this.mediaRecorder.stop();
      }
    }
    return this.stopPromise;
  }
  abort() {
    if (!this.stopRequested) {
      this.stopRequested = true;
    }
    if (this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    this.cleanupStream();
  }
  bindRecorderEvents() {
    this.mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
      }
    });
    this.mediaRecorder.addEventListener("error", (event) => {
      const errorEvent = event;
      const message = errorEvent.error?.message ?? "\u5F55\u97F3\u5931\u8D25\u3002";
      this.fail(new Error(message));
    });
    this.mediaRecorder.addEventListener("stop", () => {
      if (this.finished) {
        return;
      }
      const blob = new Blob(this.chunks, { type: this.mimeType });
      this.cleanupStream();
      if (blob.size === 0) {
        this.fail(new Error("\u5F55\u97F3\u6570\u636E\u4E3A\u7A7A\uFF0C\u8BF7\u91CD\u8BD5\u3002"));
        return;
      }
      this.finished = true;
      this.resolveStop?.({
        blob,
        mimeType: this.mimeType,
        extension: this.extension,
        durationMs: Date.now() - this.startedAt
      });
    });
  }
  fail(error) {
    if (this.finished) {
      return;
    }
    this.finished = true;
    this.cleanupStream();
    this.rejectStop?.(error);
  }
  cleanupStream() {
    this.stream.getTracks().forEach((track) => {
      if (track.readyState !== "ended") {
        track.stop();
      }
    });
  }
};

// src/recording-modal.ts
var VoiceRecordingModal = class extends import_obsidian6.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.recorder = null;
    this.timerId = null;
    this.recordingStartAt = 0;
    this.stopRequested = false;
    this.disposed = false;
    this.transcriptionService = new TranscriptionService();
  }
  onOpen() {
    this.disposed = false;
    this.modalEl.addClass("voice-flash-modal");
    this.buildUi();
    void this.startRecordingFlow();
  }
  onClose() {
    this.disposed = true;
    this.stopTimer();
    if (this.recorder) {
      this.recorder.abort();
      this.recorder = null;
    }
    this.modalEl.removeClass("voice-flash-modal");
    this.contentEl.empty();
  }
  buildUi() {
    this.contentEl.empty();
    const wrapper = this.contentEl.createDiv({ cls: "voice-flash-card" });
    wrapper.createEl("h3", { text: "\u8BED\u97F3\u95EA\u5FF5\u5F55\u97F3" });
    this.stateEl = wrapper.createDiv({ cls: "voice-flash-state", text: "\u51C6\u5907\u542F\u52A8..." });
    this.timerEl = wrapper.createDiv({ cls: "voice-flash-timer", text: "00:00" });
    this.stopButton = wrapper.createEl("button", {
      cls: "mod-cta voice-flash-stop-btn",
      text: "\u505C\u6B62\u5E76\u8F6C\u5199"
    });
    this.stopButton.addEventListener("click", () => {
      void this.stopAndProcess();
    });
    const footer = wrapper.createDiv({ cls: "voice-flash-footer" });
    this.flowStatusEl = footer.createDiv({ cls: "voice-flash-flow", text: "\u63D2\u4EF6\u542F\u52A8\uFF0C\u7B49\u5F85\u5F55\u97F3\u542F\u52A8..." });
  }
  async startRecordingFlow() {
    this.setFlowStatus("\u8BF7\u6C42\u9EA6\u514B\u98CE\u6743\u9650...");
    try {
      this.recorder = await RecordingController.start();
      this.stateEl.setText("\u6B63\u5728\u5F55\u97F3");
      this.recordingStartAt = Date.now();
      this.startTimer();
      this.setFlowStatus("\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\u624B\u52A8\u505C\u6B62\u3002");
    } catch (error) {
      const message = this.toErrorMessage(error);
      this.stateEl.setText("\u5F55\u97F3\u5931\u8D25");
      this.setFlowStatus(message);
      this.switchToCloseButton();
      new import_obsidian6.Notice(`\u5F55\u97F3\u542F\u52A8\u5931\u8D25\uFF1A${message}`, 6e3);
    }
  }
  async stopAndProcess() {
    if (this.stopRequested) {
      return;
    }
    if (!this.recorder) {
      new import_obsidian6.Notice("\u5F55\u97F3\u5C1A\u672A\u5F00\u59CB\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002", 4e3);
      return;
    }
    this.stopRequested = true;
    this.stopButton.disabled = true;
    this.stopTimer();
    this.stateEl.setText("\u5904\u7406\u4E2D");
    try {
      this.setFlowStatus("\u6B63\u5728\u7ED3\u675F\u5F55\u97F3...");
      const recording = await this.recorder.stop();
      this.recorder = null;
      this.setFlowStatus("\u6B63\u5728\u4FDD\u5B58\u5F55\u97F3\u6587\u4EF6...");
      const savedAudio = await saveAudioToVault(
        this.app,
        this.plugin.settings,
        recording.blob,
        recording.extension
      );
      this.setFlowStatus("\u6B63\u5728\u8C03\u7528 AI \u8F6C\u5199...");
      const result = await this.transcriptionService.transcribe(this.plugin.settings, {
        audioBuffer: await recording.blob.arrayBuffer(),
        fileName: savedAudio.fileName,
        mimeType: recording.mimeType
      });
      const fallbackCount = Math.max(0, result.attemptedProfiles.length - 1);
      if (fallbackCount > 0) {
        this.setFlowStatus(`\u5DF2\u81EA\u52A8\u5207\u6362\u5230 ${result.profile.name}\uFF0C\u8F6C\u5199\u5B8C\u6210\uFF0C\u7B49\u5F85\u786E\u8BA4\uFF085 \u79D2\u540E\u81EA\u52A8\u5199\u5165\uFF09...`);
      } else {
        this.setFlowStatus(`\u8F6C\u5199\u5B8C\u6210\uFF08${result.profile.name}\uFF09\uFF0C\u7B49\u5F85\u786E\u8BA4\uFF085 \u79D2\u540E\u81EA\u52A8\u5199\u5165\uFF09...`);
      }
      const finalTranscription = await new TranscriptionBufferModal(this.app, result.text, 5e3).openAndWait();
      this.setFlowStatus("\u6B63\u5728\u5199\u5165\u76EE\u6807\u7B14\u8BB0...");
      await appendTranscriptionEntry(this.app, this.plugin.settings, savedAudio.path, finalTranscription);
      this.stateEl.setText("\u5DF2\u5B8C\u6210");
      this.setFlowStatus("\u5DF2\u6210\u529F\u5199\u5165\u3002\u5373\u5C06\u5173\u95ED\u7A97\u53E3...");
      new import_obsidian6.Notice("\u8BED\u97F3\u95EA\u5FF5\u5DF2\u5199\u5165\u76EE\u6807\u7B14\u8BB0\u3002", 3500);
      window.setTimeout(() => {
        if (!this.disposed) {
          this.close();
        }
      }, 500);
    } catch (error) {
      const message = this.toErrorMessage(error);
      this.stateEl.setText("\u5931\u8D25");
      this.setFlowStatus(message);
      this.switchToCloseButton();
      new import_obsidian6.Notice(`\u8BED\u97F3\u95EA\u5FF5\u5931\u8D25\uFF1A${message}`, 7e3);
    }
  }
  startTimer() {
    this.stopTimer();
    this.timerEl.setText("00:00");
    this.timerId = window.setInterval(() => {
      if (this.disposed) {
        return;
      }
      const elapsed = Date.now() - this.recordingStartAt;
      this.timerEl.setText(formatTimer(elapsed));
    }, 1e3);
  }
  stopTimer() {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }
  setFlowStatus(message) {
    this.flowStatusEl.setText(message);
  }
  switchToCloseButton() {
    this.stopButton.disabled = false;
    this.stopButton.textContent = "\u5173\u95ED";
    const replacement = this.stopButton.cloneNode(true);
    replacement.addEventListener("click", () => this.close());
    this.stopButton.replaceWith(replacement);
    this.stopButton = replacement;
  }
  toErrorMessage(error) {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
};

// src/settings-tab.ts
var import_obsidian7 = require("obsidian");
var PROVIDER_DEFAULTS = {
  "openai-compatible": {
    baseUrl: "https://api.openai.com/v1",
    model: "whisper-1"
  },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-2.5-flash"
  }
};
var VoiceFlashSettingTab = class extends import_obsidian7.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.editingProfileId = null;
    this.draftProfile = null;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Voice Flash Memo \u8BBE\u7F6E" });
    new import_obsidian7.Setting(containerEl).setName("\u9ED8\u8BA4\u5199\u5165\u6587\u4EF6").setDesc("\u6BCF\u6B21\u8F6C\u5199\u6210\u529F\u540E\u8FFD\u52A0\u5230\u6B64\u6587\u4EF6\u5E95\u90E8\u3002\u4E0D\u5B58\u5728\u4F1A\u81EA\u52A8\u521B\u5EFA\u3002").addText(
      (text) => text.setPlaceholder("drafts.md").setValue(this.plugin.settings.defaultNoteFile).onChange(async (value) => {
        this.plugin.settings.defaultNoteFile = value.trim() || "drafts.md";
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian7.Setting(containerEl).setName("\u9644\u4EF6\u76EE\u5F55").setDesc("\u5F55\u97F3\u6587\u4EF6\u4FDD\u5B58\u76EE\u5F55\u3002\u9ED8\u8BA4 attachments\u3002").addText(
      (text) => text.setPlaceholder("attachments").setValue(this.plugin.settings.attachmentDir).onChange(async (value) => {
        this.plugin.settings.attachmentDir = value.trim() || "attachments";
        await this.plugin.saveSettings();
      })
    );
    this.renderApiProfileManager(containerEl);
    new import_obsidian7.Setting(containerEl).setName("Prompt").setDesc("\u9ED8\u8BA4\u63D0\u793A\u8BCD\uFF1A\u5C3D\u91CF\u5FE0\u5B9E\u8F6C\u5199\uFF0C\u6574\u7406\u53E3\u8BED\u3001\u65AD\u53E5\u548C\u6807\u70B9\u3002").addTextArea((text) => {
      text.setPlaceholder("\u8BF7\u5C3D\u91CF\u5FE0\u5B9E\u8F6C\u5199\uFF0C\u6574\u7406\u53E3\u8BED\u3001\u65AD\u53E5\u548C\u6807\u70B9\u3002").setValue(this.plugin.settings.prompt).onChange(async (value) => {
        this.plugin.settings.prompt = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.rows = 4;
      text.inputEl.addClass("voice-flash-prompt-setting");
    });
    new import_obsidian7.Setting(containerEl).setName("\u63D2\u5165\u5F55\u97F3\u53CC\u94FE").setDesc("\u5F00\u542F\u540E\u5728\u5199\u5165\u5757\u9996\u884C\u63D2\u5165 [[\u5F55\u97F3\u6587\u4EF6]]\u3002").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.insertAudioLink).onChange(async (value) => {
        this.plugin.settings.insertAudioLink = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian7.Setting(containerEl).setName("\u5F55\u97F3\u94FE\u63A5\u6837\u5F0F").setDesc("\u666E\u901A\u53CC\u94FE\u3001\u5D4C\u5165\u64AD\u653E\u5668\uFF0C\u6216\u4EC5\u5728\u7F16\u8F91\u6A21\u5F0F\u53EF\u89C1\u3002").addDropdown(
      (dropdown) => dropdown.addOption("edit-only", "\u4EC5\u7F16\u8F91\u6A21\u5F0F\u53EF\u89C1\uFF08recording callout\uFF09").addOption("embed", "\u5D4C\u5165\u64AD\u653E\u5668 ![[...]]").addOption("wikilink", "\u666E\u901A\u53CC\u94FE [[...]]").addOption("hidden-comment", "\u4EC5\u7F16\u8F91\u6A21\u5F0F\u53EF\u89C1\uFF08\u6CE8\u91CA\uFF0C\u975E\u771F\u5B9E\u53CC\u94FE\uFF09").setValue(this.plugin.settings.audioLinkStyle).onChange(async (value) => {
        if (value === "embed" || value === "wikilink" || value === "edit-only" || value === "hidden-comment") {
          this.plugin.settings.audioLinkStyle = value;
        }
        await this.plugin.saveSettings();
      })
    );
  }
  renderApiProfileManager(containerEl) {
    containerEl.createEl("h3", { text: "API \u914D\u7F6E\u7BA1\u7406" });
    containerEl.createEl("p", {
      cls: "voice-flash-api-manager-desc",
      text: "\u652F\u6301\u4FDD\u5B58\u591A\u4E2A API\uFF0C\u624B\u52A8\u5207\u6362\u4E3B\u7528 API\uFF1B\u5F53\u524D\u4E3B\u7528\u5931\u8D25\u65F6\u4F1A\u81EA\u52A8\u5C1D\u8BD5\u4E0B\u4E00\u4E2A\u3002"
    });
    const profiles = this.plugin.settings.apiProfiles;
    new import_obsidian7.Setting(containerEl).setName("\u5F53\u524D\u4E3B\u7528 API").setDesc(
      profiles.length > 0 ? "\u5F55\u97F3\u65F6\u4F18\u5148\u4F7F\u7528\u8FD9\u4E2A API\uFF0C\u5931\u8D25\u540E\u6309\u5217\u8868\u987A\u5E8F\u81EA\u52A8\u5C1D\u8BD5\u5176\u4ED6 API\u3002" : "\u8BF7\u5148\u65B0\u589E\u81F3\u5C11\u4E00\u4E2A API\u3002"
    ).addDropdown((dropdown) => {
      if (profiles.length === 0) {
        dropdown.addOption("", "\u8BF7\u5148\u65B0\u589E API");
        dropdown.setDisabled(true);
        return;
      }
      for (const profile of profiles) {
        dropdown.addOption(profile.id, `${profile.name} (${profile.model})`);
      }
      dropdown.setValue(this.plugin.settings.activeApiProfileId || profiles[0].id).onChange(async (value) => {
        this.plugin.setActiveApiProfile(value);
        await this.plugin.saveSettings();
        this.display();
      });
    }).addButton(
      (button) => button.setButtonText("\u65B0\u589E API").setCta().onClick(() => {
        this.startCreateProfile();
      })
    );
    const tableWrap = containerEl.createDiv({ cls: "voice-flash-api-table-wrap" });
    const table = tableWrap.createEl("table", { cls: "voice-flash-api-table" });
    const thead = table.createEl("thead");
    const headRow = thead.createEl("tr");
    ["\u4E3B\u7528", "\u540D\u79F0", "Provider", "Model", "Base URL", "API Key", "\u64CD\u4F5C"].forEach((label) => {
      headRow.createEl("th", { text: label });
    });
    const tbody = table.createEl("tbody");
    if (profiles.length === 0) {
      const emptyRow = tbody.createEl("tr");
      emptyRow.createEl("td", {
        attr: {
          colspan: "7"
        },
        text: "\u8FD8\u6CA1\u6709 API \u914D\u7F6E\u3002\u70B9\u51FB\u4E0A\u65B9\u201C\u65B0\u589E API\u201D\u5F00\u59CB\u3002"
      });
    }
    for (const profile of profiles) {
      const row = tbody.createEl("tr");
      row.toggleClass("is-active", profile.id === this.plugin.settings.activeApiProfileId);
      row.createEl("td", {
        text: profile.id === this.plugin.settings.activeApiProfileId ? "\u4E3B\u7528" : ""
      });
      row.createEl("td", { text: profile.name });
      row.createEl("td", { text: this.getProviderLabel(profile.provider) });
      row.createEl("td", { text: profile.model });
      row.createEl("td", { text: profile.baseUrl });
      row.createEl("td", { text: this.maskApiKey(profile.apiKey) });
      const actionsCell = row.createEl("td");
      const actions = actionsCell.createDiv({ cls: "voice-flash-api-actions" });
      if (profile.id !== this.plugin.settings.activeApiProfileId) {
        const primaryButton = actions.createEl("button", { text: "\u8BBE\u4E3A\u4E3B\u7528" });
        primaryButton.addEventListener("click", async () => {
          this.plugin.setActiveApiProfile(profile.id);
          await this.plugin.saveSettings();
          this.display();
        });
      }
      const editButton = actions.createEl("button", { text: "\u7F16\u8F91" });
      editButton.addEventListener("click", () => {
        this.startEditProfile(profile);
      });
      const deleteButton = actions.createEl("button", { text: "\u5220\u9664" });
      deleteButton.addEventListener("click", async () => {
        await this.deleteProfile(profile.id);
      });
    }
    if (this.draftProfile) {
      this.renderApiEditor(containerEl, this.draftProfile);
    }
  }
  renderApiEditor(containerEl, profile) {
    const isEditing = this.editingProfileId !== "__new__";
    containerEl.createEl("h4", { text: isEditing ? `\u7F16\u8F91 API\uFF1A${profile.name}` : "\u65B0\u589E API" });
    new import_obsidian7.Setting(containerEl).setName("\u540D\u79F0").setDesc("\u7528\u4E8E\u5217\u8868\u91CC\u533A\u5206\u4E0D\u540C API\uFF0C\u4F8B\u5982 OpenAI \u4E3B\u8D26\u53F7\u3001\u5907\u7528 Gemini\u3002").addText(
      (text) => text.setPlaceholder("\u4F8B\u5982\uFF1AOpenAI \u4E3B\u8D26\u53F7").setValue(profile.name).onChange((value) => {
        if (this.draftProfile) {
          this.draftProfile.name = value;
        }
      })
    );
    new import_obsidian7.Setting(containerEl).setName("Provider").setDesc("\u9009\u62E9\u5F53\u524D\u8FD9\u6761 API \u7684\u63A5\u53E3\u7C7B\u578B\u3002").addDropdown(
      (dropdown) => dropdown.addOption("openai-compatible", "OpenAI Compatible").addOption("gemini", "Gemini").setValue(profile.provider).onChange((value) => {
        if (!this.draftProfile) {
          return;
        }
        if (value === "openai-compatible" || value === "gemini") {
          const provider = value;
          this.draftProfile.provider = provider;
          this.draftProfile.baseUrl = PROVIDER_DEFAULTS[provider].baseUrl;
          this.draftProfile.model = PROVIDER_DEFAULTS[provider].model;
          this.display();
        }
      })
    );
    new import_obsidian7.Setting(containerEl).setName("API Base URL \u9884\u8BBE").setDesc("\u4E00\u952E\u586B\u5165\u5E38\u7528\u5730\u5740\u3002").addDropdown((dropdown) => {
      const options = profile.provider === "gemini" ? [
        {
          value: "https://generativelanguage.googleapis.com/v1beta",
          label: "Gemini \u5B98\u65B9"
        }
      ] : [{ value: "https://api.openai.com/v1", label: "OpenAI \u5B98\u65B9" }];
      for (const option of options) {
        dropdown.addOption(option.value, option.label);
      }
      dropdown.setValue(profile.baseUrl).onChange((value) => {
        if (this.draftProfile) {
          this.draftProfile.baseUrl = value.trim();
        }
      });
    });
    new import_obsidian7.Setting(containerEl).setName("API Base URL").setDesc("OpenAI \u517C\u5BB9: https://api.openai.com/v1\uFF1BGemini: https://generativelanguage.googleapis.com/v1beta").addText(
      (text) => text.setPlaceholder(PROVIDER_DEFAULTS[profile.provider].baseUrl).setValue(profile.baseUrl).onChange((value) => {
        if (this.draftProfile) {
          this.draftProfile.baseUrl = value.trim();
        }
      })
    );
    new import_obsidian7.Setting(containerEl).setName("API Key").setDesc("\u7528\u4E8E\u5F53\u524D\u8FD9\u6761 API \u7684\u9274\u6743\u3002").addText((text) => {
      text.inputEl.type = "password";
      text.setPlaceholder("sk-...").setValue(profile.apiKey).onChange((value) => {
        if (this.draftProfile) {
          this.draftProfile.apiKey = value.trim();
        }
      });
    });
    new import_obsidian7.Setting(containerEl).setName("Model \u9884\u8BBE").setDesc("\u4E00\u952E\u9009\u62E9\u5E38\u89C1\u6A21\u578B\u3002").addDropdown((dropdown) => {
      if (profile.provider === "gemini") {
        dropdown.addOption("gemini-2.5-flash", "gemini-2.5-flash").addOption("gemini-2.5-pro", "gemini-2.5-pro");
      } else {
        dropdown.addOption("whisper-1", "whisper-1");
      }
      dropdown.setValue(profile.model).onChange((value) => {
        if (this.draftProfile) {
          this.draftProfile.model = value.trim();
        }
      });
    });
    new import_obsidian7.Setting(containerEl).setName("Model").setDesc("\u6309\u4F60\u7684\u63A5\u53E3\u8981\u6C42\u586B\u5199\u3002").addText(
      (text) => text.setPlaceholder(PROVIDER_DEFAULTS[profile.provider].model).setValue(profile.model).onChange((value) => {
        if (this.draftProfile) {
          this.draftProfile.model = value.trim();
        }
      })
    ).addButton(
      (button) => button.setButtonText("\u4FDD\u5B58").setCta().onClick(async () => {
        await this.commitDraftProfile();
      })
    ).addButton(
      (button) => button.setButtonText("\u53D6\u6D88").onClick(() => {
        this.cancelDraftProfile();
      })
    );
  }
  startCreateProfile() {
    this.editingProfileId = "__new__";
    this.draftProfile = {
      id: `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: `API ${this.plugin.settings.apiProfiles.length + 1}`,
      provider: "openai-compatible",
      baseUrl: PROVIDER_DEFAULTS["openai-compatible"].baseUrl,
      apiKey: "",
      model: PROVIDER_DEFAULTS["openai-compatible"].model
    };
    this.display();
  }
  startEditProfile(profile) {
    this.editingProfileId = profile.id;
    this.draftProfile = { ...profile };
    this.display();
  }
  cancelDraftProfile() {
    this.editingProfileId = null;
    this.draftProfile = null;
    this.display();
  }
  async commitDraftProfile() {
    if (!this.draftProfile) {
      return;
    }
    const normalized = {
      ...this.draftProfile,
      name: this.draftProfile.name.trim() || `API ${this.plugin.settings.apiProfiles.length + 1}`,
      baseUrl: this.draftProfile.baseUrl.trim(),
      apiKey: this.draftProfile.apiKey.trim(),
      model: this.draftProfile.model.trim()
    };
    const existingIndex = this.plugin.settings.apiProfiles.findIndex(
      (profile) => profile.id === normalized.id
    );
    if (existingIndex >= 0) {
      this.plugin.settings.apiProfiles[existingIndex] = normalized;
    } else {
      this.plugin.settings.apiProfiles.push(normalized);
    }
    if (!this.plugin.settings.activeApiProfileId) {
      this.plugin.setActiveApiProfile(normalized.id);
    }
    await this.plugin.saveSettings();
    this.cancelDraftProfile();
  }
  async deleteProfile(profileId) {
    this.plugin.settings.apiProfiles = this.plugin.settings.apiProfiles.filter(
      (profile) => profile.id !== profileId
    );
    if (this.plugin.settings.activeApiProfileId === profileId) {
      this.plugin.setActiveApiProfile(this.plugin.settings.apiProfiles[0]?.id ?? "");
    }
    if (this.editingProfileId === profileId) {
      this.editingProfileId = null;
      this.draftProfile = null;
    }
    await this.plugin.saveSettings();
    this.display();
  }
  getProviderLabel(provider) {
    return provider === "gemini" ? "Gemini" : "OpenAI Compatible";
  }
  maskApiKey(apiKey) {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      return "(\u672A\u586B\u5199)";
    }
    if (trimmed.length <= 8) {
      return `${trimmed.slice(0, 2)}****`;
    }
    return `${trimmed.slice(0, 4)}****${trimmed.slice(-4)}`;
  }
};

// src/types.ts
var DEFAULT_SETTINGS = {
  defaultNoteFile: "drafts.md",
  attachmentDir: "attachments",
  apiProvider: "openai-compatible",
  apiBaseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "whisper-1",
  apiProfiles: [],
  activeApiProfileId: "",
  prompt: "\u8BF7\u5C3D\u91CF\u5FE0\u5B9E\u8F6C\u5199\uFF0C\u6574\u7406\u53E3\u8BED\u3001\u65AD\u53E5\u548C\u6807\u70B9\u3002",
  insertAudioLink: true,
  audioLinkStyle: "edit-only",
  syncFallbackMs: 6e3
};

// main.ts
var VoiceFlashMemoPlugin = class extends import_obsidian8.Plugin {
  constructor() {
    super(...arguments);
    this.settings = { ...DEFAULT_SETTINGS };
  }
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new VoiceFlashSettingTab(this.app, this));
    this.addCommand({
      id: "start-voice-flash-recording",
      name: "voiceflash",
      callback: () => this.openRecordingModal()
    });
    this.addCommand({
      id: "transcribe-existing-audio-file",
      name: "\u9009\u62E9\u5DF2\u6709\u5F55\u97F3\u5E76\u8F6C\u5199",
      callback: () => {
        void this.openExistingAudioPicker();
      }
    });
    this.addRibbonIcon("mic", "voiceflash", () => this.openRecordingModal());
  }
  onunload() {
  }
  async loadSettings() {
    const saved = await this.loadData();
    const merged = {
      ...DEFAULT_SETTINGS,
      ...saved ?? {}
    };
    this.settings = this.normalizeSettings(merged);
  }
  async saveSettings() {
    this.settings = this.normalizeSettings(this.settings);
    await this.saveData(this.settings);
  }
  openRecordingModal() {
    if (this.getOrderedApiProfiles().length === 0) {
      new import_obsidian8.Notice("\u5EFA\u8BAE\u5148\u5728\u8BBE\u7F6E\u4E2D\u786E\u8BA4 AI \u63A5\u53E3\u53C2\u6570\uFF0C\u518D\u5F00\u59CB\u5F55\u97F3\u3002", 3500);
    }
    new VoiceRecordingModal(this.app, this).open();
  }
  async openExistingAudioPicker() {
    if (this.getOrderedApiProfiles().length === 0) {
      new import_obsidian8.Notice("\u8BF7\u5148\u5728\u8BBE\u7F6E\u91CC\u6DFB\u52A0\u81F3\u5C11\u4E00\u4E2A\u53EF\u7528 API\u3002", 4e3);
      return;
    }
    const attachmentDir = this.settings.attachmentDir.trim().replace(/^\/+|\/+$/g, "");
    const audioFiles = this.app.vault.getFiles().filter((file) => {
      const path = file.path.toLowerCase();
      const inAttachmentDir = attachmentDir.length === 0 || path.startsWith(`${attachmentDir.toLowerCase()}/`);
      return inAttachmentDir && this.isAudioFile(file.extension);
    }).sort((a, b) => b.stat.mtime - a.stat.mtime);
    if (audioFiles.length === 0) {
      new import_obsidian8.Notice("\u6CA1\u6709\u627E\u5230\u53EF\u8865\u8F6C\u5199\u7684\u5F55\u97F3\u6587\u4EF6\u3002", 4e3);
      return;
    }
    const selectedFile = await new ExistingAudioPickerModal(this.app, audioFiles).openAndWait();
    if (!selectedFile) {
      return;
    }
    new ExistingAudioTranscriptionModal(this.app, this, selectedFile).open();
  }
  getOrderedApiProfiles() {
    const profiles = this.settings.apiProfiles.filter((profile) => profile.id.trim().length > 0);
    const activeId = this.settings.activeApiProfileId.trim();
    const activeIndex = profiles.findIndex((profile) => profile.id === activeId);
    if (activeIndex <= 0) {
      return profiles;
    }
    return [profiles[activeIndex], ...profiles.slice(0, activeIndex), ...profiles.slice(activeIndex + 1)];
  }
  setActiveApiProfile(profileId) {
    this.settings.activeApiProfileId = profileId;
    this.settings = this.syncLegacyApiFields(this.settings);
  }
  normalizeSettings(settings) {
    const normalizedProfiles = (settings.apiProfiles ?? []).map((profile, index) => this.normalizeProfile(profile, index)).filter((profile, index, list) => list.findIndex((item) => item.id === profile.id) === index);
    if (normalizedProfiles.length === 0 && this.hasLegacyApiConfig(settings)) {
      normalizedProfiles.push({
        id: this.createProfileId(),
        name: "\u9ED8\u8BA4 API",
        provider: settings.apiProvider,
        baseUrl: settings.apiBaseUrl.trim(),
        apiKey: settings.apiKey.trim(),
        model: settings.model.trim()
      });
    }
    const activeExists = normalizedProfiles.some(
      (profile) => profile.id === settings.activeApiProfileId.trim()
    );
    const normalized = {
      ...settings,
      apiProfiles: normalizedProfiles,
      activeApiProfileId: activeExists ? settings.activeApiProfileId.trim() : normalizedProfiles[0]?.id ?? ""
    };
    return this.syncLegacyApiFields(normalized);
  }
  syncLegacyApiFields(settings = this.settings) {
    const activeProfile = settings.apiProfiles.find((profile) => profile.id === settings.activeApiProfileId) ?? settings.apiProfiles[0];
    if (!activeProfile) {
      return {
        ...settings,
        apiProvider: DEFAULT_SETTINGS.apiProvider,
        apiBaseUrl: DEFAULT_SETTINGS.apiBaseUrl,
        apiKey: DEFAULT_SETTINGS.apiKey,
        model: DEFAULT_SETTINGS.model
      };
    }
    return {
      ...settings,
      apiProvider: activeProfile.provider,
      apiBaseUrl: activeProfile.baseUrl,
      apiKey: activeProfile.apiKey,
      model: activeProfile.model
    };
  }
  normalizeProfile(profile, index) {
    const provider = profile.provider === "gemini" ? "gemini" : "openai-compatible";
    const fallbackName = index === 0 ? "\u9ED8\u8BA4 API" : `API ${index + 1}`;
    return {
      id: profile.id?.trim() || this.createProfileId(),
      name: profile.name?.trim() || fallbackName,
      provider,
      baseUrl: profile.baseUrl?.trim() || (provider === "gemini" ? "https://generativelanguage.googleapis.com/v1beta" : DEFAULT_SETTINGS.apiBaseUrl),
      apiKey: profile.apiKey?.trim() || "",
      model: profile.model?.trim() || (provider === "gemini" ? "gemini-2.5-flash" : DEFAULT_SETTINGS.model)
    };
  }
  hasLegacyApiConfig(settings) {
    return Boolean(
      settings.apiBaseUrl.trim() || settings.apiKey.trim() || settings.model.trim()
    );
  }
  createProfileId() {
    return `api-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
  isAudioFile(extension) {
    return ["m4a", "mp3", "wav", "webm", "mp4", "ogg", "oga", "aac", "flac", "caf"].includes(
      extension.toLowerCase()
    );
  }
};
