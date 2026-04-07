# Voice Flash Memo (MVP)

一个面向 Obsidian 移动端（iPhone / iPad）的轻量语音闪念插件：

1. 触发命令后立即录音
2. 手动停止后保存音频
3. 调用可配置 AI 接口转写
4. 弹出轻量编辑框（`OK` 立即写入；无操作 2 秒自动写入）
5. 一次性追加到默认笔记底部

## 已实现范围

- 命令入口（`voiceflash`）与 Ribbon 入口
- 轻量录音弹窗（录音状态、计时器、底部状态区）
- 手动停止录音
- 音频保存到指定附件目录
- AI 转写（支持 `OpenAI Compatible` 与 `Gemini`）
- 成功后一次性追加到默认笔记底部
- 可选插入录音链接（支持多种样式）

## 写入格式

默认推荐（`仅编辑模式可见（recording callout）`）：

```markdown
录音转写内容

> [!recording]-
> ![[attachments/2026-04-07_17-14-07.m4a]]
> <!-- edited: 2026-04-07 16:14:11 +03:00 -->
```

其他可选样式：

- `![[...]]`（嵌入播放器）
- `[[...]]`（普通双链）
- `<!-- audio: [[...]] -->`（注释文本）

## Sync 说明

- 当前公开 Obsidian Plugin API 没有稳定的“Sync 已完成”可读接口。
- 本插件不会再显示伪同步状态，也不会假定同步完成。
- 因此无法在代码层做到“严格保证同步已完成”。
- 实操建议：录音前/录音后观察 Obsidian 官方 Sync 图标状态，确认完成后再退出或切后台。

## API Provider 示例

- OpenAI Compatible
  - API Provider: `OpenAI Compatible`
  - API Base URL: `https://api.openai.com/v1`
  - Model: `whisper-1`
- Gemini
  - API Provider: `Gemini`
  - API Base URL: `https://generativelanguage.googleapis.com/v1beta`
  - Model: `gemini-2.5-flash`

## 移动端后台限制

- iOS / iPadOS 在切后台后，WebView/插件任务可能被系统挂起。
- 本插件会尽量连续完成流程，但无法保证在所有后台场景下都不中断。
- 建议在录音停止与转写期间尽量保持 Obsidian 在前台。

## 开发构建

```bash
npm install
npm run build
```

将 `manifest.json`、`main.js`、`styles.css` 放到你的 vault 插件目录即可加载。
