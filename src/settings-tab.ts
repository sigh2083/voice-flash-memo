import { App, PluginSettingTab, Setting } from "obsidian";

import type VoiceFlashMemoPlugin from "../main";
import type { ApiProfile, ApiProvider } from "./types";

const PROVIDER_DEFAULTS = {
  "openai-compatible": {
    baseUrl: "https://api.openai.com/v1",
    model: "whisper-1",
  },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-2.5-flash",
  },
} as const;

export class VoiceFlashSettingTab extends PluginSettingTab {
  private editingProfileId: string | null = null;
  private draftProfile: ApiProfile | null = null;

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

    this.renderApiProfileManager(containerEl);

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

  private renderApiProfileManager(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: "API 配置管理" });
    containerEl.createEl("p", {
      cls: "voice-flash-api-manager-desc",
      text: "支持保存多个 API，手动切换主用 API；当前主用失败时会自动尝试下一个。",
    });

    const profiles = this.plugin.settings.apiProfiles;

    new Setting(containerEl)
      .setName("当前主用 API")
      .setDesc(
        profiles.length > 0
          ? "录音时优先使用这个 API，失败后按列表顺序自动尝试其他 API。"
          : "请先新增至少一个 API。",
      )
      .addDropdown((dropdown) => {
        if (profiles.length === 0) {
          dropdown.addOption("", "请先新增 API");
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
      })
      .addButton((button) =>
        button.setButtonText("新增 API").setCta().onClick(() => {
          this.startCreateProfile();
        }),
      );

    const tableWrap = containerEl.createDiv({ cls: "voice-flash-api-table-wrap" });
    const table = tableWrap.createEl("table", { cls: "voice-flash-api-table" });
    const thead = table.createEl("thead");
    const headRow = thead.createEl("tr");
    ["主用", "名称", "Provider", "Model", "Base URL", "API Key", "操作"].forEach((label) => {
      headRow.createEl("th", { text: label });
    });

    const tbody = table.createEl("tbody");
    if (profiles.length === 0) {
      const emptyRow = tbody.createEl("tr");
      emptyRow.createEl("td", {
        attr: {
          colspan: "7",
        },
        text: "还没有 API 配置。点击上方“新增 API”开始。",
      });
    }

    for (const profile of profiles) {
      const row = tbody.createEl("tr");
      row.toggleClass("is-active", profile.id === this.plugin.settings.activeApiProfileId);
      row.createEl("td", {
        text: profile.id === this.plugin.settings.activeApiProfileId ? "主用" : "",
      });
      row.createEl("td", { text: profile.name });
      row.createEl("td", { text: this.getProviderLabel(profile.provider) });
      row.createEl("td", { text: profile.model });
      row.createEl("td", { text: profile.baseUrl });
      row.createEl("td", { text: this.maskApiKey(profile.apiKey) });

      const actionsCell = row.createEl("td");
      const actions = actionsCell.createDiv({ cls: "voice-flash-api-actions" });

      if (profile.id !== this.plugin.settings.activeApiProfileId) {
        const primaryButton = actions.createEl("button", { text: "设为主用" });
        primaryButton.addEventListener("click", async () => {
          this.plugin.setActiveApiProfile(profile.id);
          await this.plugin.saveSettings();
          this.display();
        });
      }

      const editButton = actions.createEl("button", { text: "编辑" });
      editButton.addEventListener("click", () => {
        this.startEditProfile(profile);
      });

      const deleteButton = actions.createEl("button", { text: "删除" });
      deleteButton.addEventListener("click", async () => {
        await this.deleteProfile(profile.id);
      });
    }

    if (this.draftProfile) {
      this.renderApiEditor(containerEl, this.draftProfile);
    }
  }

  private renderApiEditor(containerEl: HTMLElement, profile: ApiProfile): void {
    const isEditing = this.editingProfileId !== "__new__";
    containerEl.createEl("h4", { text: isEditing ? `编辑 API：${profile.name}` : "新增 API" });

    new Setting(containerEl)
      .setName("名称")
      .setDesc("用于列表里区分不同 API，例如 OpenAI 主账号、备用 Gemini。")
      .addText((text) =>
        text
          .setPlaceholder("例如：OpenAI 主账号")
          .setValue(profile.name)
          .onChange((value) => {
            if (this.draftProfile) {
              this.draftProfile.name = value;
            }
          }),
      );

    new Setting(containerEl)
      .setName("Provider")
      .setDesc("选择当前这条 API 的接口类型。")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("openai-compatible", "OpenAI Compatible")
          .addOption("gemini", "Gemini")
          .setValue(profile.provider)
          .onChange((value: string) => {
            if (!this.draftProfile) {
              return;
            }
            if (value === "openai-compatible" || value === "gemini") {
              const provider = value as ApiProvider;
              this.draftProfile.provider = provider;
              this.draftProfile.baseUrl = PROVIDER_DEFAULTS[provider].baseUrl;
              this.draftProfile.model = PROVIDER_DEFAULTS[provider].model;
              this.display();
            }
          }),
      );

    new Setting(containerEl)
      .setName("API Base URL 预设")
      .setDesc("一键填入常用地址。")
      .addDropdown((dropdown) => {
        const options =
          profile.provider === "gemini"
            ? [
                {
                  value: "https://generativelanguage.googleapis.com/v1beta",
                  label: "Gemini 官方",
                },
              ]
            : [{ value: "https://api.openai.com/v1", label: "OpenAI 官方" }];

        for (const option of options) {
          dropdown.addOption(option.value, option.label);
        }

        dropdown.setValue(profile.baseUrl).onChange((value) => {
          if (this.draftProfile) {
            this.draftProfile.baseUrl = value.trim();
          }
        });
      });

    new Setting(containerEl)
      .setName("API Base URL")
      .setDesc("OpenAI 兼容: https://api.openai.com/v1；Gemini: https://generativelanguage.googleapis.com/v1beta")
      .addText((text) =>
        text
          .setPlaceholder(PROVIDER_DEFAULTS[profile.provider].baseUrl)
          .setValue(profile.baseUrl)
          .onChange((value) => {
            if (this.draftProfile) {
              this.draftProfile.baseUrl = value.trim();
            }
          }),
      );

    new Setting(containerEl)
      .setName("API Key")
      .setDesc("用于当前这条 API 的鉴权。")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("sk-...")
          .setValue(profile.apiKey)
          .onChange((value) => {
            if (this.draftProfile) {
              this.draftProfile.apiKey = value.trim();
            }
          });
      });

    new Setting(containerEl)
      .setName("Model 预设")
      .setDesc("一键选择常见模型。")
      .addDropdown((dropdown) => {
        if (profile.provider === "gemini") {
          dropdown
            .addOption("gemini-2.5-flash", "gemini-2.5-flash")
            .addOption("gemini-2.5-pro", "gemini-2.5-pro");
        } else {
          dropdown.addOption("whisper-1", "whisper-1");
        }

        dropdown.setValue(profile.model).onChange((value) => {
          if (this.draftProfile) {
            this.draftProfile.model = value.trim();
          }
        });
      });

    new Setting(containerEl)
      .setName("Model")
      .setDesc("按你的接口要求填写。")
      .addText((text) =>
        text
          .setPlaceholder(PROVIDER_DEFAULTS[profile.provider].model)
          .setValue(profile.model)
          .onChange((value) => {
            if (this.draftProfile) {
              this.draftProfile.model = value.trim();
            }
          }),
      )
      .addButton((button) =>
        button.setButtonText("保存").setCta().onClick(async () => {
          await this.commitDraftProfile();
        }),
      )
      .addButton((button) =>
        button.setButtonText("取消").onClick(() => {
          this.cancelDraftProfile();
        }),
      );
  }

  private startCreateProfile(): void {
    this.editingProfileId = "__new__";
    this.draftProfile = {
      id: `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: `API ${this.plugin.settings.apiProfiles.length + 1}`,
      provider: "openai-compatible",
      baseUrl: PROVIDER_DEFAULTS["openai-compatible"].baseUrl,
      apiKey: "",
      model: PROVIDER_DEFAULTS["openai-compatible"].model,
    };
    this.display();
  }

  private startEditProfile(profile: ApiProfile): void {
    this.editingProfileId = profile.id;
    this.draftProfile = { ...profile };
    this.display();
  }

  private cancelDraftProfile(): void {
    this.editingProfileId = null;
    this.draftProfile = null;
    this.display();
  }

  private async commitDraftProfile(): Promise<void> {
    if (!this.draftProfile) {
      return;
    }

    const normalized = {
      ...this.draftProfile,
      name: this.draftProfile.name.trim() || `API ${this.plugin.settings.apiProfiles.length + 1}`,
      baseUrl: this.draftProfile.baseUrl.trim(),
      apiKey: this.draftProfile.apiKey.trim(),
      model: this.draftProfile.model.trim(),
    };

    const existingIndex = this.plugin.settings.apiProfiles.findIndex(
      (profile) => profile.id === normalized.id,
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

  private async deleteProfile(profileId: string): Promise<void> {
    this.plugin.settings.apiProfiles = this.plugin.settings.apiProfiles.filter(
      (profile) => profile.id !== profileId,
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

  private getProviderLabel(provider: ApiProvider): string {
    return provider === "gemini" ? "Gemini" : "OpenAI Compatible";
  }

  private maskApiKey(apiKey: string): string {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      return "(未填写)";
    }
    if (trimmed.length <= 8) {
      return `${trimmed.slice(0, 2)}****`;
    }
    return `${trimmed.slice(0, 4)}****${trimmed.slice(-4)}`;
  }
}
