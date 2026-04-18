import { App, Modal, Notice } from "obsidian";

import type VoiceFlashMemoPlugin from "../main";
import { appendTranscriptionEntry, saveAudioToVault } from "./note-writer";
import { RecordingController } from "./recording-service";
import { formatTimer } from "./time";
import { TranscriptionBufferModal } from "./transcription-buffer-modal";
import { TranscriptionService } from "./transcription-service";

export class VoiceRecordingModal extends Modal {
  private recorder: RecordingController | null = null;
  private timerId: number | null = null;
  private recordingStartAt = 0;
  private stopRequested = false;
  private disposed = false;

  private stateEl!: HTMLElement;
  private timerEl!: HTMLElement;
  private flowStatusEl!: HTMLElement;
  private stopButton!: HTMLButtonElement;

  private readonly transcriptionService = new TranscriptionService();

  constructor(app: App, private readonly plugin: VoiceFlashMemoPlugin) {
    super(app);
  }

  onOpen(): void {
    this.disposed = false;
    this.modalEl.addClass("voice-flash-modal");
    this.buildUi();
    void this.startRecordingFlow();
  }

  onClose(): void {
    this.disposed = true;
    this.stopTimer();

    if (this.recorder) {
      this.recorder.abort();
      this.recorder = null;
    }

    this.modalEl.removeClass("voice-flash-modal");
    this.contentEl.empty();
  }

  private buildUi(): void {
    this.contentEl.empty();

    const wrapper = this.contentEl.createDiv({ cls: "voice-flash-card" });
    wrapper.createEl("h3", { text: "语音闪念录音" });

    this.stateEl = wrapper.createDiv({ cls: "voice-flash-state", text: "准备启动..." });
    this.timerEl = wrapper.createDiv({ cls: "voice-flash-timer", text: "00:00" });

    this.stopButton = wrapper.createEl("button", {
      cls: "mod-cta voice-flash-stop-btn",
      text: "停止并转写",
    });
    this.stopButton.addEventListener("click", () => {
      void this.stopAndProcess();
    });

    const footer = wrapper.createDiv({ cls: "voice-flash-footer" });
    this.flowStatusEl = footer.createDiv({ cls: "voice-flash-flow", text: "插件启动，等待录音启动..." });
  }

  private async startRecordingFlow(): Promise<void> {
    this.setFlowStatus("请求麦克风权限...");

    try {
      this.recorder = await RecordingController.start();
      this.stateEl.setText("正在录音");
      this.recordingStartAt = Date.now();
      this.startTimer();
      this.setFlowStatus("点击下方按钮手动停止。");
    } catch (error) {
      const message = this.toErrorMessage(error);
      this.stateEl.setText("录音失败");
      this.setFlowStatus(message);
      this.switchToCloseButton();
      new Notice(`录音启动失败：${message}`, 6000);
    }
  }

  private async stopAndProcess(): Promise<void> {
    if (this.stopRequested) {
      return;
    }

    if (!this.recorder) {
      new Notice("录音尚未开始，请稍后重试。", 4000);
      return;
    }

    this.stopRequested = true;
    this.stopButton.disabled = true;
    this.stopTimer();
    this.stateEl.setText("处理中");

    try {
      this.setFlowStatus("正在结束录音...");
      const recording = await this.recorder.stop();
      this.recorder = null;

      this.setFlowStatus("正在保存录音文件...");
      const savedAudio = await saveAudioToVault(
        this.app,
        this.plugin.settings,
        recording.blob,
        recording.extension,
      );

      this.setFlowStatus("正在调用 AI 转写...");
      const result = await this.transcriptionService.transcribe(this.plugin.settings, {
        audioBuffer: await recording.blob.arrayBuffer(),
        fileName: savedAudio.fileName,
        mimeType: recording.mimeType,
      });
      const fallbackCount = Math.max(0, result.attemptedProfiles.length - 1);
      if (fallbackCount > 0) {
        this.setFlowStatus(`已自动切换到 ${result.profile.name}，转写完成，等待确认（5 秒后自动写入）...`);
      } else {
        this.setFlowStatus(`转写完成（${result.profile.name}），等待确认（5 秒后自动写入）...`);
      }

      const finalTranscription = await new TranscriptionBufferModal(this.app, result.text, 5000).openAndWait();

      this.setFlowStatus("正在写入目标笔记...");
      await appendTranscriptionEntry(this.app, this.plugin.settings, savedAudio.path, finalTranscription);

      this.stateEl.setText("已完成");
      this.setFlowStatus("已成功写入。即将关闭窗口...");
      new Notice("语音闪念已写入目标笔记。", 3500);

      window.setTimeout(() => {
        if (!this.disposed) {
          this.close();
        }
      }, 500);
    } catch (error) {
      const message = this.toErrorMessage(error);
      this.stateEl.setText("失败");
      this.setFlowStatus(message);
      this.switchToCloseButton();
      new Notice(`语音闪念失败：${message}`, 7000);
    }
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerEl.setText("00:00");

    this.timerId = window.setInterval(() => {
      if (this.disposed) {
        return;
      }
      const elapsed = Date.now() - this.recordingStartAt;
      this.timerEl.setText(formatTimer(elapsed));
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private setFlowStatus(message: string): void {
    this.flowStatusEl.setText(message);
  }

  private switchToCloseButton(): void {
    this.stopButton.disabled = false;
    this.stopButton.textContent = "关闭";

    const replacement = this.stopButton.cloneNode(true) as HTMLButtonElement;
    replacement.addEventListener("click", () => this.close());
    this.stopButton.replaceWith(replacement);
    this.stopButton = replacement;
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
