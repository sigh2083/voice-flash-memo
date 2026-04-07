import { App, Modal } from "obsidian";

export class TranscriptionBufferModal extends Modal {
  private textareaEl!: HTMLTextAreaElement;
  private autoTimer: number | null = null;
  private resolved = false;
  private resolveResult!: (value: string) => void;
  private readonly resultPromise: Promise<string>;
  private editingStarted = false;
  private hintEl!: HTMLElement;

  constructor(
    app: App,
    private readonly initialText: string,
    private readonly autoCommitMs: number,
  ) {
    super(app);
    this.resultPromise = new Promise<string>((resolve) => {
      this.resolveResult = resolve;
    });
  }

  openAndWait(): Promise<string> {
    this.open();
    return this.resultPromise;
  }

  onOpen(): void {
    this.modalEl.addClass("voice-flash-buffer-modal");
    const { contentEl } = this;
    contentEl.empty();

    const wrapper = contentEl.createDiv({ cls: "voice-flash-buffer-card" });
    wrapper.createEl("h3", { text: "确认转写内容" });

    this.textareaEl = wrapper.createEl("textarea", { cls: "voice-flash-buffer-input" });
    this.textareaEl.value = this.initialText;

    this.hintEl = wrapper.createDiv({
      cls: "voice-flash-buffer-hint",
      text: `${Math.floor(this.autoCommitMs / 1000)} 秒后自动写入，可点 OK 立即写入。`,
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

  onClose(): void {
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

  private commitAndClose(): void {
    if (this.resolved) {
      return;
    }

    this.resolved = true;
    this.resolveResult(this.textareaEl.value);
    this.close();
  }

  private bindEditingSignals(): void {
    const beginEditing = (): void => {
      if (!this.editingStarted) {
        this.editingStarted = true;
        this.hintEl.setText("检测到你正在编辑，已暂停自动写入。点击 OK 提交。");
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
          `你已离开编辑框，若 ${Math.floor(this.autoCommitMs / 1000)} 秒内无操作将自动写入。`,
        );
      }
      this.scheduleAutoCommit();
    });
  }

  private scheduleAutoCommit(): void {
    this.clearAutoTimer();
    this.autoTimer = window.setTimeout(() => {
      this.commitAndClose();
    }, this.autoCommitMs);
  }

  private clearAutoTimer(): void {
    if (this.autoTimer !== null) {
      window.clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }
  }
}
