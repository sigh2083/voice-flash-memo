import type { App } from "obsidian";

export type SyncPhase = "booting" | "syncing" | "synced";

export interface SyncStatusUpdate {
  phase: SyncPhase;
  message: string;
  isFallback: boolean;
}

export interface SyncStatusHandle {
  stop(): void;
}

export class SyncStatusTracker {
  private pollTimer: number | null = null;
  private fallbackTimer: number | null = null;

  constructor(private readonly app: App, private readonly fallbackMs: number) {}

  start(onUpdate: (update: SyncStatusUpdate) => void): SyncStatusHandle {
    onUpdate({ phase: "booting", message: "插件启动", isFallback: true });

    const officialReader = this.getPotentialOfficialReader();
    if (officialReader) {
      const poll = (): void => {
        const phase = this.mapStatusToPhase(officialReader());
        if (!phase) {
          return;
        }

        onUpdate({
          phase,
          message: phase === "synced" ? "Sync 已完成" : "Sync 正在进行",
          isFallback: false,
        });
      };

      poll();
      this.pollTimer = window.setInterval(poll, 1200);

      // Guard rail: if probing never yields an answer, we still move forward via fallback.
      this.fallbackTimer = window.setTimeout(() => {
        onUpdate({ phase: "synced", message: "Sync 已完成", isFallback: true });
        this.stop();
      }, this.fallbackMs * 2);
    } else {
      // As of current public Obsidian Plugin API, Sync status is not exposed.
      // This fallback keeps UX predictable without blocking recording.
      onUpdate({ phase: "syncing", message: "Sync 正在进行", isFallback: true });
      this.fallbackTimer = window.setTimeout(() => {
        onUpdate({ phase: "synced", message: "Sync 已完成", isFallback: true });
      }, this.fallbackMs);
    }

    return {
      stop: () => this.stop(),
    };
  }

  stop(): void {
    if (this.pollTimer !== null) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.fallbackTimer !== null) {
      window.clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  private getPotentialOfficialReader(): (() => unknown) | null {
    // Forward-compatible probe only: no documented public API exists today.
    const appLike = this.app as unknown as {
      sync?: {
        getStatus?: () => unknown;
      };
    };

    if (appLike.sync && typeof appLike.sync.getStatus === "function") {
      return () => appLike.sync?.getStatus?.();
    }

    return null;
  }

  private mapStatusToPhase(status: unknown): SyncPhase | null {
    if (typeof status === "string") {
      const normalized = status.toLowerCase();
      if (normalized.includes("done") || normalized.includes("idle") || normalized.includes("complete")) {
        return "synced";
      }
      if (normalized.includes("sync")) {
        return "syncing";
      }
    }

    if (typeof status === "object" && status !== null) {
      const candidate = status as {
        syncing?: unknown;
        completed?: unknown;
      };

      if (candidate.completed === true) {
        return "synced";
      }
      if (candidate.syncing === true) {
        return "syncing";
      }
    }

    return null;
  }
}
