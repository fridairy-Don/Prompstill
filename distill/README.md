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

## 部署到 iPhone (PWA, 不上 App Store)

代码同时支持浏览器/PWA 模式。在 web 中 invoke→fetch、Keychain→localStorage、SQLite→localStorage,
其它 UI / 视觉 / 状态机完全复用。

### 一次性 Vercel 部署

1. push experiments 分支 (含 PWA 适配)到 GitHub (本仓库已就绪)
2. 在 [vercel.com](https://vercel.com/new) 用 GitHub 登录, 导入 `Prompstill` 仓库
3. **Root Directory** 设为 `distill`, framework 自动识别为 Vite
4. (可选) Production Branch 选 `main`, Preview Branch 选 `experiments`
5. Deploy → 拿到 `<your-project>.vercel.app` 域名

### iPhone 安装 (3 步)

1. iPhone Safari 打开 `https://<your-project>.vercel.app`
2. 进设置, 粘 OpenRouter / Kimi 的 key (存 localStorage, 不离开你的设备)
3. Safari 分享按钮 → **添加到主屏幕** → 桌面多一个 Distill 图标
4. 之后从图标启动即全屏体验, ⌘↵ 在外接键盘上触发优化 (无键盘可点按钮)

### Web 模式限制 (跟 macOS 桌面版的差异)

| 功能 | 桌面版 | Web/PWA |
|---|---|---|
| API key 存储 | macOS Keychain | localStorage (**不要分享 URL**, 浏览器 devtools 可读) |
| 历史记录 | SQLite (~∞ MB) | localStorage (~5 MB, 自动 trim 100 条) |
| 全局 ⌘⇧Space 唤出 | ✓ | ✗ (PWA 没有系统级快捷键, 从主屏点开图标) |
| 编辑 prompts.md 文件 | ✓ (本地文件) | ✗ (内嵌在 `src/lib/web-prompts.ts`, 改后 push 重部署) |
| 流式输出 | Tauri Channel + Rust SSE | fetch ReadableStream + JS SSE 解析 |
| 离线启动 app shell | ✓ (binary) | ✓ (Service Worker 缓存) |
| 离线优化 prompt | ✗ (要联网) | ✗ (要联网) |

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
