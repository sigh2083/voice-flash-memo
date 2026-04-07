import { RecordingResult } from "./types";

const MIME_CANDIDATES = [
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

const pickMimeType = (): string => {
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

const guessExtension = (mimeType: string): string => {
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

export class RecordingController {
  private readonly chunks: Blob[] = [];
  private readonly startedAt = Date.now();
  private readonly stopPromise: Promise<RecordingResult>;
  private resolveStop?: (result: RecordingResult) => void;
  private rejectStop?: (error: Error) => void;
  private stopRequested = false;
  private finished = false;

  private constructor(
    private readonly mediaRecorder: MediaRecorder,
    private readonly stream: MediaStream,
    private readonly mimeType: string,
    private readonly extension: string,
  ) {
    this.stopPromise = new Promise<RecordingResult>((resolve, reject) => {
      this.resolveStop = resolve;
      this.rejectStop = reject;
    });

    this.bindRecorderEvents();
    this.mediaRecorder.start();
  }

  static async start(): Promise<RecordingController> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("当前环境不支持录音 API。");
    }

    if (typeof MediaRecorder === "undefined") {
      throw new Error("当前环境不支持 MediaRecorder。");
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const pickedMimeType = pickMimeType();
    const recorderOptions = pickedMimeType ? { mimeType: pickedMimeType } : undefined;
    const recorder = new MediaRecorder(stream, recorderOptions);

    const resolvedMimeType = recorder.mimeType || pickedMimeType || "audio/mp4";
    const extension = guessExtension(resolvedMimeType);

    return new RecordingController(recorder, stream, resolvedMimeType, extension);
  }

  async stop(): Promise<RecordingResult> {
    if (!this.stopRequested) {
      this.stopRequested = true;
      if (this.mediaRecorder.state !== "inactive") {
        this.mediaRecorder.stop();
      }
    }

    return this.stopPromise;
  }

  abort(): void {
    if (!this.stopRequested) {
      this.stopRequested = true;
    }

    if (this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }

    this.cleanupStream();
  }

  private bindRecorderEvents(): void {
    this.mediaRecorder.addEventListener("dataavailable", (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
      }
    });

    this.mediaRecorder.addEventListener("error", (event: Event) => {
      const errorEvent = event as ErrorEvent;
      const message = errorEvent.error?.message ?? "录音失败。";
      this.fail(new Error(message));
    });

    this.mediaRecorder.addEventListener("stop", () => {
      if (this.finished) {
        return;
      }

      const blob = new Blob(this.chunks, { type: this.mimeType });
      this.cleanupStream();

      if (blob.size === 0) {
        this.fail(new Error("录音数据为空，请重试。"));
        return;
      }

      this.finished = true;
      this.resolveStop?.({
        blob,
        mimeType: this.mimeType,
        extension: this.extension,
        durationMs: Date.now() - this.startedAt,
      });
    });
  }

  private fail(error: Error): void {
    if (this.finished) {
      return;
    }

    this.finished = true;
    this.cleanupStream();
    this.rejectStop?.(error);
  }

  private cleanupStream(): void {
    this.stream.getTracks().forEach((track) => {
      if (track.readyState !== "ended") {
        track.stop();
      }
    });
  }
}
