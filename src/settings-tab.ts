import { App, PluginSettingTab, Setting } from "obsidian";

import type VoiceFlashMemoPlugin from "../main";

export class VoiceFlashSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: VoiceFlashMemoPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Voice Flash Memo 设置" });

    new Setting(containerEl)
      .setName("默认写入文件")
      .setDesc("每次转写成功后追加到此文件底部。不存在会自动创建。")
      .addText((text) =>
        text
          .setPlaceholder("drafts.md")
          .setValue(this.plugin.settings.defaultNoteFile)
          .onChange(async (value) => {
            this.plugin.settings.defaultNoteFile = value.trim() || "drafts.md";
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("附件目录")
      .setDesc("录音文件保存目录。默认 attachments。")
      .addText((text) =>
        text
          .setPlaceholder("attachments")
          .setValue(this.plugin.settings.attachmentDir)
          .onChange(async (value) => {
            this.plugin.settings.attachmentDir = value.trim() || "attachments";
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("API Base URL")
      .setDesc("例如 https://api.openai.com/v1")
      .addText((text) =>
        text
          .setPlaceholder("https://api.openai.com/v1")
          .setValue(this.plugin.settings.apiBaseUrl)
          .onChange(async (value) => {
            this.plugin.settings.apiBaseUrl = value.trim();
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("API Key")
      .setDesc("用于音频转写接口鉴权。")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("sk-...")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Model")
      .setDesc("转写模型名，按你的接口要求填写。")
      .addText((text) =>
        text
          .setPlaceholder("whisper-1")
          .setValue(this.plugin.settings.model)
          .onChange(async (value) => {
            this.plugin.settings.model = value.trim() || "whisper-1";
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Prompt")
      .setDesc("默认提示词：尽量忠实转写，整理口语、断句和标点。")
      .addTextArea((text) => {
        text
          .setPlaceholder("请尽量忠实转写，整理口语、断句和标点。")
          .setValue(this.plugin.settings.prompt)
          .onChange(async (value) => {
            this.plugin.settings.prompt = value;
            await this.plugin.saveSettings();
          });

        text.inputEl.rows = 4;
        text.inputEl.addClass("voice-flash-prompt-setting");
      });

    new Setting(containerEl)
      .setName("插入录音双链")
      .setDesc("开启后在写入块首行插入 [[录音文件]]。")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.insertAudioLink).onChange(async (value) => {
          this.plugin.settings.insertAudioLink = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("录音链接样式")
      .setDesc("普通双链、嵌入播放器，或仅在编辑模式可见。")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("edit-only", "仅编辑模式可见（recording callout）")
          .addOption("embed", "嵌入播放器 ![[...]]")
          .addOption("wikilink", "普通双链 [[...]]")
          .addOption("hidden-comment", "仅编辑模式可见（注释，非真实双链）")
          .setValue(this.plugin.settings.audioLinkStyle)
          .onChange(async (value: string) => {
            if (
              value === "embed" ||
              value === "wikilink" ||
              value === "edit-only" ||
              value === "hidden-comment"
            ) {
              this.plugin.settings.audioLinkStyle = value;
            }
            await this.plugin.saveSettings();
          }),
      );
  }
}
