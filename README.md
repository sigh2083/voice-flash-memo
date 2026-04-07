# Voice Flash Memo (MVP)

一个面向 Obsidian 移动端（iPhone / iPad）的轻量语音闪念插件：

1. 触发命令后立即录音
2. 手动停止后保存音频
3. 调用可配置 AI 接口转写
4. 一次性追加到默认笔记底部

## 已实现范围

- 命令入口与 Ribbon 入口
- 轻量录音弹窗（录音状态、计时器、底部状态区）
- 手动停止录音
- 音频保存到指定附件目录
- AI 转写（`API Base URL / API Key / Model / Prompt`）
- 成功后一次性追加到默认笔记底部
- 可选插入 `[[录音文件]]`

## 写入格式

```markdown
- [[attachments/2026-04-07_17-14-07.m4a]]
录音转写内容
<!-- edited: 2026-04-07 16:14:11 +03:00 -->
```

## Sync 状态说明

- 当前公开 Obsidian Plugin API 未提供官方 Sync 状态读取接口。
- 插件采用 fallback：启动后显示“Sync 正在进行”，到达合理时间后显示“Sync 已完成”。
- 代码中保留了未来官方接口的探测点（若将来公开 API，可直接接入）。

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
