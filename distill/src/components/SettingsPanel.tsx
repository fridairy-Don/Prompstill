import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "../store/useAppStore";
import {
  clearHistory,
  deleteApiKey,
  keyStatus,
  openPromptsDir,
  promptsDir,
  resetDefaultPrompts,
  setApiKey,
  validateApiKey,
} from "../lib/api";
import { isTauri } from "../lib/env";
import type { Provider } from "../lib/types";

interface ProviderRowProps {
  provider: Provider;
  label: string;
  testModel: string;
  hasKey: boolean;
  onChanged: () => void;
}

function ProviderRow({
  provider,
  label,
  testModel,
  hasKey,
  onChanged,
}: ProviderRowProps) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSave = async () => {
    if (!value.trim()) return;
    setBusy(true);
    setStatus(null);
    try {
      await setApiKey(provider, value.trim());
      try {
        await validateApiKey(provider, testModel);
        setStatus("已保存并验证 ✓");
      } catch (e) {
        setStatus(`已保存, 验证失败: ${String(e)}`);
      }
      setValue("");
      onChanged();
    } catch (e) {
      setStatus(`保存失败: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await deleteApiKey(provider);
      setStatus("已删除");
      onChanged();
    } catch (e) {
      setStatus(`删除失败: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-2 flex flex-col gap-2 rounded-[12px] border-[2px] border-ink bg-cream-2 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-extrabold tracking-tight text-ink">
          {label}
        </span>
        {hasKey ? (
          <span className="rounded-full border-[1.5px] border-ink bg-mint px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-ink">
            已配置
          </span>
        ) : (
          <span className="text-[10px] font-semibold text-ink-faint">
            未配置
          </span>
        )}
      </div>
      <div className="flex gap-1.5">
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={hasKey ? "粘贴新 key 覆盖" : "粘贴 sk-... key"}
          disabled={busy}
          className="flex-1 rounded-[8px] border-[2px] border-ink bg-cream px-2.5 py-1.5 font-mono text-[12px] text-ink outline-0 transition-all focus:-translate-x-0.5 focus:-translate-y-0.5 focus:shadow-stamp-sm"
        />
        <button
          onClick={onSave}
          disabled={busy || !value.trim()}
          className="rounded-full border-[2px] border-ink bg-ink px-3 py-1 text-[11px] font-bold text-cream transition-colors hover:bg-mauve disabled:opacity-40"
        >
          保存
        </button>
        {hasKey && (
          <button
            onClick={onDelete}
            disabled={busy}
            className="rounded-full border-[2px] border-ink bg-transparent px-3 py-1 text-[11px] font-bold text-ink transition-colors hover:bg-ink hover:text-cream disabled:opacity-40"
          >
            删除
          </button>
        )}
      </div>
      {status && (
        <p className="text-[11px] font-medium text-ink-mute">{status}</p>
      )}
    </div>
  );
}

function PromptsSection() {
  const [dir, setDir] = useState<string>("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    promptsDir().then(setDir).catch(() => {});
  }, []);

  const onOpen = async () => {
    setStatus(null);
    try {
      await openPromptsDir();
      setStatus("已在 Finder 打开, 编辑保存后下次优化即生效, 无需重启");
    } catch (e) {
      setStatus(`打开失败: ${String(e)}`);
    }
  };

  const onReset = async () => {
    if (
      !confirm("用内置默认覆盖 distill.md / code.md / product.md? 你的修改会丢失。")
    ) {
      return;
    }
    setStatus(null);
    try {
      await resetDefaultPrompts();
      setStatus("已重置为内置默认");
    } catch (e) {
      setStatus(`重置失败: ${String(e)}`);
    }
  };

  return (
    <div className="mb-2 flex flex-col gap-2 rounded-[12px] border-[2px] border-ink bg-cream-2 p-3">
      <p className="text-[11px] font-medium leading-relaxed text-ink-mute">
        3 个预设的 prompt 文件存在本地, 编辑后下次优化即生效, 无需重启或重建。
      </p>
      <p className="break-all text-[10px] font-medium text-ink-faint">
        {dir || "..."}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={onOpen}
          className="rounded-full border-[2px] border-ink bg-ink px-3 py-1 text-[11px] font-bold text-cream transition-colors hover:bg-mauve"
        >
          打开 prompts 目录
        </button>
        <button
          onClick={onReset}
          className="rounded-full border-[2px] border-ink bg-transparent px-3 py-1 text-[11px] font-bold text-ink transition-colors hover:bg-ink hover:text-cream"
        >
          重置默认
        </button>
      </div>
      {status && (
        <p className="text-[11px] font-medium text-ink-mute">{status}</p>
      )}
    </div>
  );
}

function HistoryControls() {
  const { setHistory } = useAppStore();
  const [confirming, setConfirming] = useState(false);

  const onClear = async () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 2500);
      return;
    }
    try {
      await clearHistory();
      setHistory([]);
      setConfirming(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="mb-2 flex flex-col gap-2 rounded-[12px] border-[2px] border-ink bg-cream-2 p-3">
      <div className="flex items-center justify-between text-[12px] font-semibold text-ink">
        <span>保留最近</span>
        <span className="text-ink-mute">100 条 (超出自动删除最早)</span>
      </div>
      <div className="flex items-center justify-between text-[12px] font-semibold text-ink">
        <span>清空全部历史</span>
        <button
          onClick={onClear}
          className={`rounded-full border-[2px] border-ink px-3 py-1 text-[11px] font-bold transition-all ${
            confirming
              ? "bg-mauve text-cream"
              : "bg-transparent text-ink hover:bg-mauve hover:text-cream"
          }`}
        >
          {confirming ? "再点确认" : "清空"}
        </button>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-ink">
      {children}
    </div>
  );
}

function KvRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center justify-between rounded-[12px] border-[2px] border-ink bg-cream-2 px-3.5 py-2.5">
      <span className="text-[12px] font-semibold text-ink">{label}</span>
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink">
        {children}
      </span>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-[5px] border-[1.5px] border-ink bg-cream px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink">
      {children}
    </kbd>
  );
}

export function SettingsPanel() {
  const { settingsOpen, setSettingsOpen } = useAppStore();
  const [status, setStatus] = useState<{ openrouter: boolean; kimi: boolean }>(
    { openrouter: false, kimi: false },
  );

  const refresh = () => {
    keyStatus().then(setStatus);
  };

  useEffect(() => {
    if (settingsOpen) refresh();
  }, [settingsOpen]);

  return (
    <AnimatePresence>
      {settingsOpen && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 z-[12] flex flex-col overflow-hidden bg-cream"
        >
          <div className="flex flex-shrink-0 items-center justify-between border-b-[2px] border-ink p-[18px] pb-3">
            <span className="text-[18px] font-extrabold tracking-tight text-ink">
              设置 ✦
            </span>
            <button
              onClick={() => setSettingsOpen(false)}
              className="grid h-7 w-7 place-items-center rounded-full border-[2px] border-ink bg-cream text-[14px] font-extrabold text-ink transition-colors hover:bg-ink hover:text-cream"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-4 overflow-y-auto px-[18px] pb-[18px] pt-4">
            <div>
              <SectionLabel>API Keys</SectionLabel>
              <ProviderRow
                provider="openrouter"
                label="OpenRouter"
                testModel="anthropic/claude-sonnet-4.6"
                hasKey={status.openrouter}
                onChanged={refresh}
              />
              <ProviderRow
                provider="kimi"
                label="Kimi (Moonshot)"
                testModel="kimi-k2-0905-preview"
                hasKey={status.kimi}
                onChanged={refresh}
              />
            </div>

            {isTauri() && (
              <div>
                <SectionLabel>Prompts</SectionLabel>
                <PromptsSection />
              </div>
            )}

            {isTauri() && (
              <div>
                <SectionLabel>快捷键</SectionLabel>
                <KvRow label="唤出窗口">
                  <Kbd>⌘</Kbd>
                  <Kbd>⇧</Kbd>
                  <Kbd>Space</Kbd>
                </KvRow>
                <KvRow label="触发优化">
                  <Kbd>⌘</Kbd>
                  <Kbd>↵</Kbd>
                </KvRow>
                <KvRow label="收起窗口">
                  <Kbd>esc</Kbd>
                </KvRow>
              </div>
            )}

            <div>
              <SectionLabel>历史记录</SectionLabel>
              <HistoryControls />
            </div>

            {!isTauri() && (
              <div>
                <SectionLabel>Web 模式说明</SectionLabel>
                <div className="rounded-[12px] border-[2px] border-ink bg-cream-2 p-3 text-[11px] font-medium leading-relaxed text-ink-mute">
                  <p className="mb-2">
                    你正在浏览器/PWA 中使用 Distill。API key 存在 localStorage,
                    历史也在本地, **不要把这个 URL 分享给别人**(他们可在 devtools
                    里看到你的 key)。
                  </p>
                  <p>
                    iPhone: Safari 打开此页 → 分享 → 添加到主屏幕, 之后从桌面
                    图标启动即全屏体验。⌘↵ 在外接键盘上仍能触发优化。
                  </p>
                </div>
              </div>
            )}

            <div>
              <SectionLabel>关于</SectionLabel>
              <div className="rounded-[12px] border-[2px] border-ink bg-cream-2 p-4 text-center text-[11px] font-semibold leading-relaxed text-ink-mute">
                Distill v0.2.0{" "}
                <span className="text-mauve text-[14px]">●</span>{" "}
                {isTauri() ? "macOS 菜单栏 prompt 工具" : "Web/PWA prompt 工具"}
                <br />
                <a
                  href="https://github.com/fridairy-Don/Prompstill"
                  className="font-bold text-ink underline"
                >
                  github.com/fridairy-Don/Prompstill
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
