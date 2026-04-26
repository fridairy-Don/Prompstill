# Distill (Prompstill)

把碎碎念蒸馏成 AI Prompt 的 macOS 菜单栏小工具。

常驻菜单栏, 全局 ⌘⇧Space 呼出, 输入口语化的碎碎念, 一键改写成结构化 prompt 复制走。

> 这不是聊天工具, 不回答问题, 不给建议。它只做一件事: 当你和 AI 之间的"语言翻译官"。

## 三个内置 Preset

| 模式 | 适用 | 推荐模型 |
|---|---|---|
| **碎碎念** | 通用碎碎念 → 清晰 prompt | Claude Sonnet 4.6 |
| **代码反馈** | 给 Claude Code / Cursor 等 coding agent 的反馈 | Claude Sonnet 4.6 |
| **产品工程** | 模糊产品想法 → 完整 Vibe Coding 规格(技术栈/前后端/核心功能/设计约束) | Claude Opus 4.7 |

切换 preset 时模型自动跳到推荐, 用户可临时覆盖。完整规则与 system prompt 见 [`PRESETS.md`](PRESETS.md)。

## AI Provider

- **OpenRouter** (推荐, 一站式接入 Claude / GPT / Gemini)
- **Kimi** (Moonshot, 国内备选)

两家都走 OpenAI Chat Completions 兼容协议, 客户端复用一套代码。API key 通过 macOS Keychain 安全存储。

## 技术栈

- 桌面框架: Tauri 2.x (Rust + Webview)
- 前端: React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- 后端: Rust (reqwest + rusqlite + keyring)
- 数据: SQLite (历史记录), macOS Keychain (API keys)

## 开发

前置: Node 18+, Rust stable (arm64 推荐), macOS

```bash
cd distill
npm install
npm run tauri dev
```

## 验收要点 (M1-M5)

- [x] M1 骨架: tray + ⌘⇧Space + ESC
- [x] M2 核心: 设置 / Keychain / 优化 / 复制
- [x] M3 流式 + 历史: SSE 流式 + 中断 + SQLite 历史卡片
- [x] M4 打磨: 菜单栏锚定窗口位置 + macOS vibrancy + 卡片过渡 + 错误分类
- [ ] M5 发布: 图标 / DMG / 签名 (待做)

## 项目结构

```
distill/
├── src/                         # React 前端
│   ├── components/              # InputCard / OutputCard / Toolbar / HistoryList / SettingsPanel
│   ├── lib/                     # types / api(invoke 封装)
│   └── store/useAppStore.ts     # Zustand
├── src-tauri/src/               # Rust 后端
│   ├── lib.rs                   # tray + 全局快捷键 + 窗口位置 + vibrancy + 入口
│   ├── prompts.rs               # 3 个 preset system prompt + 模型表
│   ├── ai_client.rs             # OpenAI 兼容 (流式 + 非流式)
│   ├── keychain.rs              # macOS Keychain 封装
│   ├── db.rs                    # SQLite + 迁移
│   └── commands.rs              # Tauri command surface
├── PRESETS.md                   # 3 个 preset 横向对比 + 完整 prompt
└── PRD-Prompstill.md            # 产品需求文档(在仓库根目录)
```

## License

未指定。
