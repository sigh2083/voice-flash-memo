import { FuzzySuggestModal, TFile } from "obsidian";

export class ExistingAudioPickerModal extends FuzzySuggestModal<TFile> {
  private resolveSelection!: (value: TFile | null) => void;
  private readonly resultPromise: Promise<TFile | null>;
  private resolved = false;

  constructor(
    app: ConstructorParameters<typeof FuzzySuggestModal<TFile>>[0],
    private readonly audioFiles: TFile[],
  ) {
    super(app);
    this.resultPromise = new Promise<TFile | null>((resolve) => {
      this.resolveSelection = resolve;
    });

    this.setPlaceholder("选择一个已有录音继续转写...");
  }

  openAndWait(): Promise<TFile | null> {
    this.open();
    return this.resultPromise;
  }

  getItems(): TFile[] {
    return this.audioFiles;
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  renderSuggestion(file: TFile, el: HTMLElement): void {
    el.createDiv({ text: file.basename, cls: "voice-flash-picker-title" });
    el.createDiv({ text: file.path, cls: "voice-flash-picker-path" });
  }

  onChooseItem(file: TFile): void {
    this.resolved = true;
    this.resolveSelection(file);
    this.resolveSelection = () => undefined;
  }

  onClose(): void {
    super.onClose();
    if (!this.resolved && this.resolveSelection) {
      this.resolveSelection(null);
      this.resolveSelection = () => undefined;
    }
  }
}
