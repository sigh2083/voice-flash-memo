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
var import_obsidian5 = require("obsidian");

// src/recording-modal.ts
var import_obsidian3 = require("obsidian");

// src/note-writer.ts
var import_obsidian = require("obsidian");

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
  const normalized = (0, import_obsidian.normalizePath)(folderPath).replace(/^\/+|\/+$/g, "");
  if (!normalized) {
    return;
  }
  const segments = normalized.split("/").filter(Boolean);
  let current = "";
  for (const segment of segments) {
    current = current ? `${current}/${segment}` : segment;
    const existing = app.vault.getAbstractFileByPath(current);
    if (existing instanceof import_obsidian.TFile) {
      throw new Error(`\u8DEF\u5F84 ${current} \u5DF2\u5B58\u5728\u540C\u540D\u6587\u4EF6\uFF0C\u65E0\u6CD5\u521B\u5EFA\u6587\u4EF6\u5939\u3002`);
    }
    if (!existing) {
      await app.vault.createFolder(current);
    }
  }
};
var ensureParentFolder = async (app, fullPath) => {
  const normalized = (0, import_obsidian.normalizePath)(fullPath);
  const slash = normalized.lastIndexOf("/");
  if (slash <= 0) {
    return;
  }
  const folder = normalized.slice(0, slash);
  await ensureFolderExists(app, folder);
};
var ensureMarkdownPath = (path) => {
  const normalized = (0, import_obsidian.normalizePath)((path.trim() || "drafts.md").replace(/^\/+/, ""));
  return normalized.toLowerCase().endsWith(".md") ? normalized : `${normalized}.md`;
};
var buildFilePath = (folder, extension, baseName, index) => {
  const suffix = index === 0 ? "" : `_${index}`;
  const fileName = `${baseName}${suffix}.${extension}`;
  return (0, import_obsidian.normalizePath)(`${folder}/${fileName}`);
};
var isAlreadyExistsError = (error) => {
  const message = error instanceof Error ? error.message : String(error);
  return /already exists/i.test(message);
};
var delay = async (ms) => new Promise((resolve) => {
  window.setTimeout(resolve, ms);
});
var saveAudioToVault = async (app, settings, blob, extension) => {
  const targetFolder = (0, import_obsidian.normalizePath)(settings.attachmentDir.trim() || "attachments");
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
  if (settings.insertAudioLink) {
    lines.push(`- [[${audioPath}]]`);
  }
  lines.push(transcription.trim());
  lines.push(`<!-- edited: ${formatEditedTimestamp(/* @__PURE__ */ new Date())} -->`);
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
  if (abstract && !(abstract instanceof import_obsidian.TFile)) {
    throw new Error(`\u9ED8\u8BA4\u5199\u5165\u6587\u4EF6 ${targetPath} \u4E0D\u662F Markdown \u6587\u4EF6\u3002`);
  }
  const appendByAdapter = async () => {
    const stat = await app.vault.adapter.stat(targetPath);
    const prefix = stat && stat.size > 0 ? "\n" : "";
    await app.vault.adapter.append(targetPath, `${prefix}${entry}`);
  };
  const existsOnDisk = await app.vault.adapter.exists(targetPath);
  if (existsOnDisk) {
    const file = app.vault.getFileByPath(targetPath);
    if (file) {
      const prefix = file.stat.size > 0 ? "\n" : "";
      await app.vault.append(file, `${prefix}${entry}`);
      return;
    }
    await appendByAdapter();
    return;
  }
  try {
    await app.vault.create(targetPath, entry);
    return;
  } catch (error) {
    if (!isAlreadyExistsError(error)) {
      throw error;
    }
  }
  for (let i = 0; i < 5; i += 1) {
    const file = app.vault.getFileByPath(targetPath);
    if (file) {
      const prefix = file.stat.size > 0 ? "\n" : "";
      await app.vault.append(file, `${prefix}${entry}`);
      return;
    }
    await delay(80);
  }
  const existsAfterCreateRace = await app.vault.adapter.exists(targetPath);
  if (!existsAfterCreateRace) {
    throw new Error(`\u9ED8\u8BA4\u5199\u5165\u6587\u4EF6 ${targetPath} \u521B\u5EFA\u5931\u8D25\u3002`);
  }
  await appendByAdapter();
};

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

// src/transcription-service.ts
var import_obsidian2 = require("obsidian");
var TranscriptionService = class {
  async transcribe(settings, input) {
    this.validateSettings(settings);
    const endpoint = this.resolveEndpoint(settings.apiBaseUrl);
    const boundary = `----voice-flash-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
    const body = this.buildMultipartBody(boundary, settings, input);
    const response = await (0, import_obsidian2.requestUrl)({
      url: endpoint,
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.apiKey.trim()}`,
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
  validateSettings(settings) {
    if (!settings.apiBaseUrl.trim()) {
      throw new Error("\u8BF7\u5148\u5728\u8BBE\u7F6E\u4E2D\u586B\u5199 API Base URL\u3002");
    }
    if (!settings.apiKey.trim()) {
      throw new Error("\u8BF7\u5148\u5728\u8BBE\u7F6E\u4E2D\u586B\u5199 API Key\u3002");
    }
    if (!settings.model.trim()) {
      throw new Error("\u8BF7\u5148\u5728\u8BBE\u7F6E\u4E2D\u586B\u5199 Model\u3002");
    }
  }
  resolveEndpoint(baseUrl) {
    const trimmed = baseUrl.trim().replace(/\/+$/g, "");
    if (trimmed.endsWith("/audio/transcriptions")) {
      return trimmed;
    }
    return `${trimmed}/audio/transcriptions`;
  }
  buildMultipartBody(boundary, settings, input) {
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
    pushTextPart("model", settings.model.trim());
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
  extractText(response) {
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
  extractError(response) {
    const json = response.json;
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
  tryParseJson(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
};

// src/recording-modal.ts
var VoiceRecordingModal = class extends import_obsidian3.Modal {
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
      new import_obsidian3.Notice(`\u5F55\u97F3\u542F\u52A8\u5931\u8D25\uFF1A${message}`, 6e3);
    }
  }
  async stopAndProcess() {
    if (this.stopRequested) {
      return;
    }
    if (!this.recorder) {
      new import_obsidian3.Notice("\u5F55\u97F3\u5C1A\u672A\u5F00\u59CB\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002", 4e3);
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
      const transcription = await this.transcriptionService.transcribe(this.plugin.settings, {
        audioBuffer: await recording.blob.arrayBuffer(),
        fileName: savedAudio.fileName,
        mimeType: recording.mimeType
      });
      this.setFlowStatus("\u6B63\u5728\u5199\u5165\u76EE\u6807\u7B14\u8BB0...");
      await appendTranscriptionEntry(this.app, this.plugin.settings, savedAudio.path, transcription);
      this.stateEl.setText("\u5DF2\u5B8C\u6210");
      this.setFlowStatus("\u5DF2\u6210\u529F\u5199\u5165\u3002\u5373\u5C06\u5173\u95ED\u7A97\u53E3...");
      new import_obsidian3.Notice("\u8BED\u97F3\u95EA\u5FF5\u5DF2\u5199\u5165\u76EE\u6807\u7B14\u8BB0\u3002", 3500);
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
      new import_obsidian3.Notice(`\u8BED\u97F3\u95EA\u5FF5\u5931\u8D25\uFF1A${message}`, 7e3);
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
var import_obsidian4 = require("obsidian");
var VoiceFlashSettingTab = class extends import_obsidian4.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Voice Flash Memo \u8BBE\u7F6E" });
    new import_obsidian4.Setting(containerEl).setName("\u9ED8\u8BA4\u5199\u5165\u6587\u4EF6").setDesc("\u6BCF\u6B21\u8F6C\u5199\u6210\u529F\u540E\u8FFD\u52A0\u5230\u6B64\u6587\u4EF6\u5E95\u90E8\u3002\u4E0D\u5B58\u5728\u4F1A\u81EA\u52A8\u521B\u5EFA\u3002").addText(
      (text) => text.setPlaceholder("drafts.md").setValue(this.plugin.settings.defaultNoteFile).onChange(async (value) => {
        this.plugin.settings.defaultNoteFile = value.trim() || "drafts.md";
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian4.Setting(containerEl).setName("\u9644\u4EF6\u76EE\u5F55").setDesc("\u5F55\u97F3\u6587\u4EF6\u4FDD\u5B58\u76EE\u5F55\u3002\u9ED8\u8BA4 attachments\u3002").addText(
      (text) => text.setPlaceholder("attachments").setValue(this.plugin.settings.attachmentDir).onChange(async (value) => {
        this.plugin.settings.attachmentDir = value.trim() || "attachments";
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian4.Setting(containerEl).setName("API Base URL").setDesc("\u4F8B\u5982 https://api.openai.com/v1").addText(
      (text) => text.setPlaceholder("https://api.openai.com/v1").setValue(this.plugin.settings.apiBaseUrl).onChange(async (value) => {
        this.plugin.settings.apiBaseUrl = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian4.Setting(containerEl).setName("API Key").setDesc("\u7528\u4E8E\u97F3\u9891\u8F6C\u5199\u63A5\u53E3\u9274\u6743\u3002").addText((text) => {
      text.inputEl.type = "password";
      text.setPlaceholder("sk-...").setValue(this.plugin.settings.apiKey).onChange(async (value) => {
        this.plugin.settings.apiKey = value.trim();
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian4.Setting(containerEl).setName("Model").setDesc("\u8F6C\u5199\u6A21\u578B\u540D\uFF0C\u6309\u4F60\u7684\u63A5\u53E3\u8981\u6C42\u586B\u5199\u3002").addText(
      (text) => text.setPlaceholder("whisper-1").setValue(this.plugin.settings.model).onChange(async (value) => {
        this.plugin.settings.model = value.trim() || "whisper-1";
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian4.Setting(containerEl).setName("Prompt").setDesc("\u9ED8\u8BA4\u63D0\u793A\u8BCD\uFF1A\u5C3D\u91CF\u5FE0\u5B9E\u8F6C\u5199\uFF0C\u6574\u7406\u53E3\u8BED\u3001\u65AD\u53E5\u548C\u6807\u70B9\u3002").addTextArea((text) => {
      text.setPlaceholder("\u8BF7\u5C3D\u91CF\u5FE0\u5B9E\u8F6C\u5199\uFF0C\u6574\u7406\u53E3\u8BED\u3001\u65AD\u53E5\u548C\u6807\u70B9\u3002").setValue(this.plugin.settings.prompt).onChange(async (value) => {
        this.plugin.settings.prompt = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.rows = 4;
      text.inputEl.addClass("voice-flash-prompt-setting");
    });
    new import_obsidian4.Setting(containerEl).setName("\u63D2\u5165\u5F55\u97F3\u53CC\u94FE").setDesc("\u5F00\u542F\u540E\u5728\u5199\u5165\u5757\u9996\u884C\u63D2\u5165 [[\u5F55\u97F3\u6587\u4EF6]]\u3002").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.insertAudioLink).onChange(async (value) => {
        this.plugin.settings.insertAudioLink = value;
        await this.plugin.saveSettings();
      })
    );
  }
};

// src/types.ts
var DEFAULT_SETTINGS = {
  defaultNoteFile: "drafts.md",
  attachmentDir: "attachments",
  apiBaseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "whisper-1",
  prompt: "\u8BF7\u5C3D\u91CF\u5FE0\u5B9E\u8F6C\u5199\uFF0C\u6574\u7406\u53E3\u8BED\u3001\u65AD\u53E5\u548C\u6807\u70B9\u3002",
  insertAudioLink: true,
  syncFallbackMs: 6e3
};

// main.ts
var VoiceFlashMemoPlugin = class extends import_obsidian5.Plugin {
  constructor() {
    super(...arguments);
    this.settings = { ...DEFAULT_SETTINGS };
  }
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new VoiceFlashSettingTab(this.app, this));
    this.addCommand({
      id: "start-voice-flash-recording",
      name: "\u5F00\u59CB\u8BED\u97F3\u95EA\u5FF5\u5F55\u97F3",
      callback: () => this.openRecordingModal()
    });
    this.addRibbonIcon("mic", "\u8BED\u97F3\u95EA\u5FF5\u5F55\u97F3", () => this.openRecordingModal());
  }
  onunload() {
  }
  async loadSettings() {
    const saved = await this.loadData();
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...saved ?? {}
    };
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  openRecordingModal() {
    if (!this.settings.apiBaseUrl.trim() || !this.settings.model.trim()) {
      new import_obsidian5.Notice("\u5EFA\u8BAE\u5148\u5728\u8BBE\u7F6E\u4E2D\u786E\u8BA4 AI \u63A5\u53E3\u53C2\u6570\uFF0C\u518D\u5F00\u59CB\u5F55\u97F3\u3002", 3500);
    }
    new VoiceRecordingModal(this.app, this).open();
  }
};
