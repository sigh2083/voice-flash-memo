import { Notice, Plugin } from "obsidian";

import { VoiceRecordingModal } from "./src/recording-modal";
import { VoiceFlashSettingTab } from "./src/settings-tab";
import { DEFAULT_SETTINGS, VoiceFlashSettings } from "./src/types";

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

    this.addRibbonIcon("mic", "voiceflash", () => this.openRecordingModal());
  }

  onunload(): void {
    // All DOM/event resources are auto-cleaned by Obsidian lifecycle.
  }

  async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) as Partial<VoiceFlashSettings> | null;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(saved ?? {}),
    };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private openRecordingModal(): void {
    if (!this.settings.apiBaseUrl.trim() || !this.settings.model.trim()) {
      new Notice("建议先在设置中确认 AI 接口参数，再开始录音。", 3500);
    }

    new VoiceRecordingModal(this.app, this).open();
  }
}
