import { App, normalizePath, TFile } from "obsidian";

import { formatEditedTimestamp, formatFileTimestamp } from "./time";
import { VoiceFlashSettings } from "./types";

export interface SavedAudio {
  path: string;
  fileName: string;
}

const ensureFolderExists = async (app: App, folderPath: string): Promise<void> => {
  const normalized = normalizePath(folderPath).replace(/^\/+|\/+$/g, "");
  if (!normalized) {
    return;
  }

  const segments = normalized.split("/").filter(Boolean);
  let current = "";

  for (const segment of segments) {
    current = current ? `${current}/${segment}` : segment;
    const existing = app.vault.getAbstractFileByPath(current);
    if (existing instanceof TFile) {
      throw new Error(`路径 ${current} 已存在同名文件，无法创建文件夹。`);
    }
    if (!existing) {
      await app.vault.createFolder(current);
    }
  }
};

const ensureParentFolder = async (app: App, fullPath: string): Promise<void> => {
  const normalized = normalizePath(fullPath);
  const slash = normalized.lastIndexOf("/");
  if (slash <= 0) {
    return;
  }

  const folder = normalized.slice(0, slash);
  await ensureFolderExists(app, folder);
};

const ensureMarkdownPath = (path: string): string => {
  const normalized = normalizePath((path.trim() || "drafts.md").replace(/^\/+/, ""));
  return normalized.toLowerCase().endsWith(".md") ? normalized : `${normalized}.md`;
};

const buildFilePath = (folder: string, extension: string, baseName: string, index: number): string => {
  const suffix = index === 0 ? "" : `_${index}`;
  const fileName = `${baseName}${suffix}.${extension}`;
  return normalizePath(`${folder}/${fileName}`);
};

const isAlreadyExistsError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return /already exists/i.test(message);
};

const delay = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const findFileByPathLoose = (app: App, targetPath: string): TFile | null => {
  const direct = app.vault.getFileByPath(targetPath);
  if (direct) {
    return direct;
  }

  const normalizedLower = normalizePath(targetPath).toLowerCase();
  for (const file of app.vault.getFiles()) {
    if (normalizePath(file.path).toLowerCase() === normalizedLower) {
      return file;
    }
  }

  return null;
};

export const saveAudioToVault = async (
  app: App,
  settings: VoiceFlashSettings,
  blob: Blob,
  extension: string,
): Promise<SavedAudio> => {
  const targetFolder = normalizePath(settings.attachmentDir.trim() || "attachments");
  await ensureFolderExists(app, targetFolder);

  const bytes = await blob.arrayBuffer();
  const baseName = formatFileTimestamp(new Date());

  // Some platforms can race with vault indexing; retry with suffix on "already exists".
  for (let index = 0; index < 200; index += 1) {
    const filePath = buildFilePath(targetFolder, extension, baseName, index);
    try {
      await app.vault.createBinary(filePath, bytes);
      return {
        path: filePath,
        fileName: filePath.split("/").pop() ?? filePath,
      };
    } catch (error) {
      if (isAlreadyExistsError(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("录音文件名连续冲突，保存失败。请稍后重试。");
};

const buildEntry = (settings: VoiceFlashSettings, audioPath: string, transcription: string): string => {
  const lines: string[] = [];
  const editedLine = `<!-- edited: ${formatEditedTimestamp(new Date())} -->`;

  lines.push(transcription.trim());

  if (settings.insertAudioLink) {
    lines.push("");

    if (settings.audioLinkStyle === "hidden-comment") {
      lines.push(`<!-- audio: [[${audioPath}]] -->`);
      lines.push(editedLine);
    } else if (settings.audioLinkStyle === "edit-only") {
      lines.push(`> [!recording]-`);
      lines.push(`> ![[${audioPath}]]`);
      lines.push(`> ${editedLine}`);
    } else if (settings.audioLinkStyle === "embed") {
      lines.push(`![[${audioPath}]]`);
      lines.push("");
      lines.push(editedLine);
    } else {
      lines.push(`[[${audioPath}]]`);
      lines.push("");
      lines.push(editedLine);
    }
  } else {
    lines.push("");
    lines.push(editedLine);
  }

  return `${lines.join("\n")}\n`;
};

export const appendTranscriptionEntry = async (
  app: App,
  settings: VoiceFlashSettings,
  audioPath: string,
  transcription: string,
): Promise<void> => {
  const cleaned = transcription.trim();
  if (!cleaned) {
    throw new Error("转写结果为空，已取消写入。");
  }

  const targetPath = ensureMarkdownPath(settings.defaultNoteFile);
  await ensureParentFolder(app, targetPath);
  const entry = buildEntry(settings, audioPath, cleaned);
  const abstract = app.vault.getAbstractFileByPath(targetPath);
  if (abstract && !(abstract instanceof TFile)) {
    throw new Error(`默认写入目标 ${targetPath} 不是文件，请修改设置。`);
  }

  let file = findFileByPathLoose(app, targetPath);

  if (!file) {
    try {
      file = await app.vault.create(targetPath, entry);
      return;
    } catch (error) {
      if (!isAlreadyExistsError(error)) {
        throw error;
      }
    }

    // File may have been created concurrently; wait briefly for vault index.
    for (let i = 0; i < 8; i += 1) {
      file = findFileByPathLoose(app, targetPath);
      if (file) {
        break;
      }
      await delay(80);
    }
  }

  if (!file) {
    throw new Error(`检测到 ${targetPath} 写入状态不稳定，已中止以防覆盖，请重试。`);
  }

  await app.vault.process(file, (oldContent) => {
    const prefix = oldContent.length > 0 ? "\n" : "";
    return `${oldContent}${prefix}${entry}`;
  });
};
