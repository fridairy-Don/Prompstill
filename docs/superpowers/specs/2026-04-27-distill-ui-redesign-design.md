# Distill UI Redesign — Y2K Revival × Modern Productivity

> Design spec, 2026-04-27. Branch: `experiments`.
> Style direction confirmed via prototype iterations 01-08 in `.superpowers/brainstorm/`.

## 1. Style guide (canonical)

```
风格名: Y2K Revival × Modern Productivity
中文别名: 奶油怀旧 × 当代生产力
```

### 1.1 布局结构 (Layout)

- 单一容器优先: 用 1 个魔法框替代 input + output 双框
- 主区 ≥ 60% 高度
- 二级菜单走抽屉 / 内嵌面板, 不用弹窗
- 18px 内边距, 主区 / 工具栏 / 抽屉触发条 三段式

### 1.2 组件形态

- 容器: 12-16px 圆角矩形
- 按钮 / Tab / Tag: 999px 全圆角 pill
- 内联 callout / chip: 6-8px 小圆角
- 任何交互组件至少有 1 个 pill 形态

### 1.3 字体

- Body: Inter 500, 14-16px, line-height 1.55, letter-spacing -0.005em
- Display: Inter 700-800, letter-spacing -0.02em
- Mono: ui-monospace / Menlo (仅 API key / `<kbd>` 等技术内容)
- 中英文混排直接 Inter 覆盖, 不加中文 fallback

### 1.4 颜色

| Token | Light | Dark | 用途 |
|---|---|---|---|
| `--cream` | `#f5ecd5` | `#1c1610` | app 主背景 |
| `--cream-2` | `#fdf6e8` | `#2a2218` | 卡片 / 输入区 |
| `--cream-3` | `#ebe0c4` | `#16110b` | 子层次 / 选中 |
| `--ink` | `#0a0a0a` | `#f5ecd5` | 文字 / 边框 (纯, 不用灰) |
| `--ink-mute` | `#3d3d3d` | `#c4b896` | 二级文字 |
| `--ink-faint` | `#8a8170` | `#6e6450` | 三级文字 / placeholder |
| `--mauve` | `#9b3a3a` | `#d97a7a` | 碎碎念 preset |
| `--terracotta` | `#e85d2c` | `#f08c5a` | 代码 preset |
| `--lavender` | `#8a7ab8` | `#b8a8d6` | 产品 preset |
| `--mint` | `#5a8c70` | `#88c0a0` | OK / 已配置状态 |
| `--mustard` | `#d4a52e` | `#f0c04a` | highlight / `[推测:]` chip |

### 1.5 材质

- 描边: solid 2-2.5px 纯黑 hairline (`--ink`), 不模糊、不渐变、不双层
- 阴影: solid 偏移 ("图章感") — `box-shadow: 3px 3px 0 var(--ink)`, **不用 blur**
- 不把 `backdrop-filter: blur` 当主材质 (Tauri 已在 OS 层做 vibrancy)
- 可选 SVG 微粒纸纹 opacity ≤ 5% (mix-blend-mode: multiply)

### 1.6 层级

- z-index 三层: 主内容 (1) → 抽屉 / 设置面板 (9-12) → backdrop (8)
- 视觉权重靠对比度, 不靠阴影深度
- 主操作: 纯黑填充 + solid 偏移影 3-4px
- 次操作: 透明 + 黑边 pill
- 三级: 仅文字 + ink-mute

### 1.7 交互

- 焦点态: 容器 `translate(-2px,-2px)` + 影子放大 `4px 4px 0`
- 主按钮按下: `translate(2px,2px)` + 影子归 0 (图章按下)
- 卡片 hover: 浮起 + 影子放大
- 菜单展开: pop-up + stagger (子项 25-30ms 弹性延迟)
- 菜单关闭: fade + scale 0.96, 无 stagger
- 状态切换缓动: `cubic-bezier(0.22, 1, 0.36, 1)`, 280ms
- 弹性缓动 (仅菜单 stagger): `cubic-bezier(0.34, 1.56, 0.64, 1)`

### 1.8 装饰

- ✦ sparkle dingbat 全局 ≤ 2 处 (魔法框右上 + 设置标题)
- ●●● traffic-light 红黄绿三圆点 (11px, 1.5px 黑边) 容器左上
- mustard 黄 chip + 黑边 → 用于 `[推测: xxx]` 内联标记
- 历史卡片 tag 用 cream 反贴 (奶白底 + 黑边 + 黑字) 在 pop 色块上

---

## 2. 信息架构 (锁定不动)

### 2.1 主面板 (480 × 540)

```
┌─────────────────────────────────┐
│ ●●●                          ⚙  │  ← traffic lights + cog
│                                 │
│  ┌─────────────────────────┐ ✦  │
│  │                         │    │
│  │  把碎碎念扔进来…           │    │  ← magic box (~65%)
│  │                         │    │
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
│  [● 碎碎念 ▾]  Sonnet 4.6 ▾  [⌘↵ 优化]│  ← toolbar
│                                 │
│       ▲ 历史 (3)                │  ← drawer trigger
└─────────────────────────────────┘
```

### 2.2 状态机 — Magic Box

```
idle ──click 优化──> dissolving ──280ms──> streaming ──[DONE]──> complete
 ▲                                                                  │
 └──────────────────── click "新一条" ──────────────────────────────┘
```

各阶段视觉:

| 阶段 | UI |
|---|---|
| `idle` | textarea 编辑态, placeholder 或用户输入 |
| `dissolving` | textarea opacity 1→0 + translateY 0→-8 + blur 0→2, 280ms |
| `streaming` | output 容器 fade-in (opacity 0→1, translateY 8→0, 80ms 延迟), 字符逐个 append, mustard 高亮 `[推测:]`, 闪烁光标 |
| `complete` | 右上"复制"+"新一条" 滑入, output 可编辑 |

### 2.3 Mode dropdown — 可扩展

- 不在 toolbar 平铺 chip, 单按钮 `[● 碎碎念 ▾]`, 点击向上弹菜单
- 菜单项: 当前 3 个 (碎碎念 / 代码反馈 / 产品工程) + 1 个灰色占位 ("情感 / 育儿 / …")
- 加新模式只改 `prompts.rs` + 菜单数据, **不改布局**
- 各模式有自己的 Pop color dot (mauve / terracotta / lavender)

### 2.4 Model picker — 区分动效

- 简洁文字按钮 `[Sonnet 4.6 ▾]`, 无边框
- 菜单 fade + 4px slide, **无 stagger**, 区别于 mode 的弹性 stagger

### 2.5 History drawer

- 默认收起, 底部条 `▲ 历史 (3)` 触发
- 打开: 从底部滑上来 (translateY 100%→0, 320ms), backdrop 模糊
- 卡片用 Pop color 块填充, **不同 preset 不同颜色**
- 点卡片 inline 展开 (grid-rows 0fr→1fr 平滑)

### 2.6 Settings panel

- 点 ⚙ 触发: cross-fade 替换主区 (z-index 12)
- 顶部固定 header "设置 ✦" + ✕
- 滚动 body 包含: API Keys / Prompts / 快捷键 / 历史 / 关于
- 关闭: ✕ 或再次点 ⚙

---

## 3. 文件级改动

### 3.1 新增文件

- `distill/src/components/MagicBox.tsx` — 单容器, 状态机, AnimatePresence
- `distill/src/components/ModeDropdown.tsx` — 弹性 stagger 菜单
- `distill/src/components/ModelPicker.tsx` — 简单 fade 菜单
- `distill/src/components/StampButton.tsx` — 优化按钮 (黑底 + 偏移影)
- `distill/src/components/HistoryDrawer.tsx` — 底部抽屉 (替代 HistoryList)
- `distill/src/components/TrafficLights.tsx` — 装饰组件
- `distill/src/styles/tokens.css` — CSS 变量 (cream/ink/pop colors)

### 3.2 修改文件

- `distill/package.json` — 加 `framer-motion@^11`
- `distill/tailwind.config.js` — extend theme.colors with new tokens
- `distill/src/App.css` — 改 base styles (Inter font, cream bg, ink colors)
- `distill/src/App.tsx` — 删标题, 加 traffic lights, drawer/settings 状态机, 用新组件
- `distill/src/store/useAppStore.ts` — 加 `drawerOpen`, 重命名 view→`activePanel`
- `distill/src/components/SettingsPanel.tsx` — 套新视觉 (黑边 + pill + pop color)
- `distill/src/components/Toolbar.tsx` — 拆解到 ModeDropdown / ModelPicker / StampButton

### 3.3 删除文件

- `distill/src/components/InputCard.tsx` — 合并入 MagicBox
- `distill/src/components/OutputCard.tsx` — 合并入 MagicBox
- `distill/src/components/HistoryList.tsx` — 替换为 HistoryDrawer

### 3.4 不动

- 整个 Rust 后端 (`src-tauri/`) — 仅前端 UI 改造
- `lib/api.ts` 的 invoke 接口
- prompts.rs / ai_client.rs / commands.rs / db.rs

---

## 4. 依赖

### 4.1 新增

- **framer-motion** `^11` — 唯一新依赖, ~50KB gzipped
  - 用途: `AnimatePresence` (魔法框 swap), `motion.div layout` (mode dropdown), 抽屉 / 设置面板的 enter/exit

### 4.2 不引入

- ~~shadcn/ui~~ — 不需要, Tailwind 原生组件 + framer-motion 够
- ~~View Transitions API~~ — 兼容性不稳, 不当主方案
- ~~radix-ui~~ — 暂不需要 Dialog/Popover 原语

---

## 5. 实施计划 (autonomous)

### Phase 1: 基础设施 (~5 min)
1. `npm install framer-motion@^11`
2. 写 `tokens.css` (CSS 变量, light + dark)
3. 改 `tailwind.config.js` (extend theme.colors)
4. 改 `App.css` (Inter font import, base bg, dark mode 切换)

### Phase 2: 组件层 (~15 min)
1. 写 `MagicBox.tsx` (state machine + AnimatePresence + cursor)
2. 写 `ModeDropdown.tsx` (button + menu with stagger)
3. 写 `ModelPicker.tsx` (button + menu fade)
4. 写 `StampButton.tsx` (黑底 + offset shadow)
5. 写 `HistoryDrawer.tsx` (motion.div bottom sheet + pop-color cards)
6. 写 `TrafficLights.tsx` (装饰组件)
7. 重写 `Toolbar.tsx` 用上面 4 个
8. 重写 `SettingsPanel.tsx` (新视觉)

### Phase 3: 应用层 (~5 min)
1. 改 `App.tsx` (删标题, 加 traffic lights / sparkle, drawer/settings 状态)
2. 改 `useAppStore.ts` (加 drawerOpen, settingsOpen)

### Phase 4: 清理 (~2 min)
1. 删 `InputCard.tsx`, `OutputCard.tsx`, `HistoryList.tsx`

### Phase 5: 验证 (~3 min)
1. `cargo check` (后端无变化但确保链接正确)
2. `npx tsc --noEmit`
3. 看 dev 自动 reload, 验证: 入场动画, 优化流式, 复制, 历史抽屉, 设置面板, 模式切换, 模型切换, 浅深色

### Phase 6: Commit + push
- 单一 atomic commit "feat(ui): redesign to Y2K Revival aesthetic"
- Push 到 `experiments` 分支

---

## 6. 验收

实施完成的标准:

- [ ] 按 ⌘⇧Space 唤出, 看到全新视觉 (奶油 + 黑边 + traffic lights)
- [ ] 输入碎碎念, 点优化, 看到原文淡出 + 同框流式打印 + mustard `[推测:]` 高亮
- [ ] 模式 dropdown 弹性 stagger 菜单展开
- [ ] 模型 picker 简单 fade 菜单 (跟 mode 区分)
- [ ] 优化按钮 hover 浮起 + 按下"图章"
- [ ] 点 ▲ 历史 抽屉从底部滑上来, 卡片是 pop color 块
- [ ] 点 ⚙ 设置面板替换主区, 完整内容可见
- [ ] 切换深色: 深棕 base + 奶油描边, pop colors 提亮
- [ ] dev hot reload 改 `tokens.css` 实时生效

---

## 7. 风险与回退

- **Framer Motion 体积**: 50KB 可接受, 不需要 tree-shake
- **Inter 字体加载**: 用 system-ui fallback, 离线降级到 SF Pro / system sans
- **Tauri WebKit transform 性能**: 偏移影子是 GPU 友好的, 不卡
- **回退**: 如果 v4 实施后用户不满意, `git revert` 到上一 commit, 不影响 main 分支

---

End of spec.
