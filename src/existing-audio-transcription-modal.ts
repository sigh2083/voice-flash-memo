import { App, Modal, Notice, TFile, normalizePath } from "obsidian";

import type VoiceFlashMemoPlugin from "../main";
import { appendTranscriptionEntry } from "./note-writer";
import { TranscriptionBufferModal } from "./transcription-buffer-modal";
import { TranscriptionService } from "./transcription-service";

const AUDIO_MIME_TYPES: Record<string, string> = {
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  webm: "audio/webm",
  mp4: "audio/mp4",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  aac: "audio/aac",
  flac: "audio/flac",
  caf: "audio/x-caf",
};

export class ExistingAudioTranscriptionModal extends Modal {
  private disposed = false;
  private stateEl!: HTMLElement;
  private flowStatusEl!: HTMLElement;
  private closeButton!: HTMLButtonElement;
  private readonly transcriptionService = new TranscriptionService();

  constructor(
    app: App,
    private readonly plugin: VoiceFlashMemoPlugin,
    private readonly audioFile: TFile,
  ) {
    super(app);
  }

  onOpen(): void {
    this.disposed = false;
    this.modalEl.addClass("voice-flash-modal");
    this.buildUi();
    void this.processExistingAudio();
  }

  onClose(): void {
    this.disposed = true;
    this.modalEl.removeClass("voice-flash-modal");
    this.contentEl.empty();
  }

  private buildUi(): void {
    this.contentEl.empty();

    const wrapper = this.contentEl.createDiv({ cls: "voice-flash-card" });
    wrapper.createEl("h3", { text: "补转写已有录音" });

    this.stateEl = wrapper.createDiv({ cls: "voice-flash-state", text: "准备中..." });
    wrapper.createDiv({ cls: "voice-flash-existing-file", text: this.audioFile.path });

    this.closeButton = wrapper.createEl("button", {
      cls: "voice-flash-stop-btn",
      text: "关闭",
    });
    this.closeButton.addEventListener("click", () => this.close());

    const footer = wrapper.createDiv({ cls: "voice-flash-footer" });
    this.flowStatusEl = footer.createDiv({ cls: "voice-flash-flow", text: "正在读取音频文件..." });
  }

  private async processExistingAudio(): Promise<void> {
    this.stateEl.setText("处理中");

    try {
      const buffer = await this.app.vault.readBinary(this.audioFile);
      this.setFlowStatus("正在调用 AI 转写...");

      const result = await this.transcriptionService.transcribe(this.plugin.settings, {
        audioBuffer: buffer,
        fileName: this.audioFile.name,
        mimeType: this.resolveMimeType(this.audioFile),
      });

      const fallbackCount = Math.max(0, result.attemptedProfiles.length - 1);
      if (fallbackCount > 0) {
        this.setFlowStatus(`已自动切换到 ${result.profile.name}，转写完成，等待确认（5 秒后自动写入）...`);
      } else {
        this.setFlowStatus(`转写完成（${result.profile.name}），等待确认（5 秒后自动写入）...`);
      }

      const finalTranscription = await new TranscriptionBufferModal(this.app, result.text, 5000).openAndWait();

      this.setFlowStatus("正在写入目标笔记...");
      await appendTranscriptionEntry(
        this.app,
        this.plugin.settings,
        normalizePath(this.audioFile.path),
        finalTranscription,
      );

      this.stateEl.setText("已完成");
      this.setFlowStatus("已成功写入。即将关闭窗口...");
      new Notice("旧录音已成功补转写并写入目标笔记。", 3500);

      window.setTimeout(() => {
        if (!this.disposed) {
          this.close();
        }
      }, 500);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.stateEl.setText("失败");
      this.setFlowStatus(message);
      new Notice(`补转写失败：${message}`, 7000);
    }
  }

  private resolveMimeType(file: TFile): string {
    const extension = file.extension.toLowerCase();
    return AUDIO_MIME_TYPES[extension] ?? "application/octet-stream";
  }

  private setFlowStatus(message: string): void {
    this.flowStatusEl.setText(message);
  }
}
