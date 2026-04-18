import { Notice, Plugin } from "obsidian";

import { ExistingAudioPickerModal } from "./src/existing-audio-picker-modal";
import { ExistingAudioTranscriptionModal } from "./src/existing-audio-transcription-modal";
import { VoiceRecordingModal } from "./src/recording-modal";
import { VoiceFlashSettingTab } from "./src/settings-tab";
import { ApiProfile, DEFAULT_SETTINGS, VoiceFlashSettings } from "./src/types";

export default class VoiceFlashMemoPlugin extends Plugin {
  settings: VoiceFlashSettings = { ...DEFAULT_SETTINGS };

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addSettingTab(new VoiceFlashSettingTab(this.app, this));

    this.addCommand({
      id: "start-voice-flash-recording",
      name: "voiceflash",
      callback: () => this.openRecordingModal(),
    });

    this.addCommand({
      id: "transcribe-existing-audio-file",
      name: "选择已有录音并转写",
      callback: () => {
        void this.openExistingAudioPicker();
      },
    });

    this.addRibbonIcon("mic", "voiceflash", () => this.openRecordingModal());
  }

  onunload(): void {
    // All DOM/event resources are auto-cleaned by Obsidian lifecycle.
  }

  async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) as Partial<VoiceFlashSettings> | null;
    const merged = {
      ...DEFAULT_SETTINGS,
      ...(saved ?? {}),
    };
    this.settings = this.normalizeSettings(merged);
  }

  async saveSettings(): Promise<void> {
    this.settings = this.normalizeSettings(this.settings);
    await this.saveData(this.settings);
  }

  private openRecordingModal(): void {
    if (this.getOrderedApiProfiles().length === 0) {
      new Notice("建议先在设置中确认 AI 接口参数，再开始录音。", 3500);
    }

    new VoiceRecordingModal(this.app, this).open();
  }

  private async openExistingAudioPicker(): Promise<void> {
    if (this.getOrderedApiProfiles().length === 0) {
      new Notice("请先在设置里添加至少一个可用 API。", 4000);
      return;
    }

    const attachmentDir = this.settings.attachmentDir.trim().replace(/^\/+|\/+$/g, "");
    const audioFiles = this.app.vault
      .getFiles()
      .filter((file) => {
        const path = file.path.toLowerCase();
        const inAttachmentDir =
          attachmentDir.length === 0 || path.startsWith(`${attachmentDir.toLowerCase()}/`);
        return inAttachmentDir && this.isAudioFile(file.extension);
      })
      .sort((a, b) => b.stat.mtime - a.stat.mtime);

    if (audioFiles.length === 0) {
      new Notice("没有找到可补转写的录音文件。", 4000);
      return;
    }

    const selectedFile = await new ExistingAudioPickerModal(this.app, audioFiles).openAndWait();
    if (!selectedFile) {
      return;
    }

    new ExistingAudioTranscriptionModal(this.app, this, selectedFile).open();
  }

  getOrderedApiProfiles(): ApiProfile[] {
    const profiles = this.settings.apiProfiles.filter((profile) => profile.id.trim().length > 0);
    const activeId = this.settings.activeApiProfileId.trim();
    const activeIndex = profiles.findIndex((profile) => profile.id === activeId);

    if (activeIndex <= 0) {
      return profiles;
    }

    return [profiles[activeIndex], ...profiles.slice(0, activeIndex), ...profiles.slice(activeIndex + 1)];
  }

  setActiveApiProfile(profileId: string): void {
    this.settings.activeApiProfileId = profileId;
    this.settings = this.syncLegacyApiFields(this.settings);
  }

  private normalizeSettings(settings: VoiceFlashSettings): VoiceFlashSettings {
    const normalizedProfiles = (settings.apiProfiles ?? [])
      .map((profile, index) => this.normalizeProfile(profile, index))
      .filter((profile, index, list) => list.findIndex((item) => item.id === profile.id) === index);

    if (normalizedProfiles.length === 0 && this.hasLegacyApiConfig(settings)) {
      normalizedProfiles.push({
        id: this.createProfileId(),
        name: "默认 API",
        provider: settings.apiProvider,
        baseUrl: settings.apiBaseUrl.trim(),
        apiKey: settings.apiKey.trim(),
        model: settings.model.trim(),
      });
    }

    const activeExists = normalizedProfiles.some(
      (profile) => profile.id === settings.activeApiProfileId.trim(),
    );
    const normalized: VoiceFlashSettings = {
      ...settings,
      apiProfiles: normalizedProfiles,
      activeApiProfileId: activeExists
        ? settings.activeApiProfileId.trim()
        : (normalizedProfiles[0]?.id ?? ""),
    };

    return this.syncLegacyApiFields(normalized);
  }

  private syncLegacyApiFields(settings: VoiceFlashSettings = this.settings): VoiceFlashSettings {
    const activeProfile =
      settings.apiProfiles.find((profile) => profile.id === settings.activeApiProfileId) ??
      settings.apiProfiles[0];

    if (!activeProfile) {
      return {
        ...settings,
        apiProvider: DEFAULT_SETTINGS.apiProvider,
        apiBaseUrl: DEFAULT_SETTINGS.apiBaseUrl,
        apiKey: DEFAULT_SETTINGS.apiKey,
        model: DEFAULT_SETTINGS.model,
      };
    }

    return {
      ...settings,
      apiProvider: activeProfile.provider,
      apiBaseUrl: activeProfile.baseUrl,
      apiKey: activeProfile.apiKey,
      model: activeProfile.model,
    };
  }

  private normalizeProfile(profile: Partial<ApiProfile>, index: number): ApiProfile {
    const provider = profile.provider === "gemini" ? "gemini" : "openai-compatible";
    const fallbackName = index === 0 ? "默认 API" : `API ${index + 1}`;

    return {
      id: profile.id?.trim() || this.createProfileId(),
      name: profile.name?.trim() || fallbackName,
      provider,
      baseUrl:
        profile.baseUrl?.trim() ||
        (provider === "gemini"
          ? "https://generativelanguage.googleapis.com/v1beta"
          : DEFAULT_SETTINGS.apiBaseUrl),
      apiKey: profile.apiKey?.trim() || "",
      model:
        profile.model?.trim() ||
        (provider === "gemini" ? "gemini-2.5-flash" : DEFAULT_SETTINGS.model),
    };
  }

  private hasLegacyApiConfig(settings: VoiceFlashSettings): boolean {
    return Boolean(
      settings.apiBaseUrl.trim() || settings.apiKey.trim() || settings.model.trim(),
    );
  }

  private createProfileId(): string {
    return `api-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private isAudioFile(extension: string): boolean {
    return ["m4a", "mp3", "wav", "webm", "mp4", "ogg", "oga", "aac", "flac", "caf"].includes(
      extension.toLowerCase(),
    );
  }
}
