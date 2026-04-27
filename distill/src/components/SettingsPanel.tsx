import { useEffect, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import {
  deleteApiKey,
  keyStatus,
  openPromptsDir,
  promptsDir,
  resetDefaultPrompts,
  setApiKey,
  validateApiKey,
} from "../lib/api";
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
    <div className="rounded-lg border border-neutral-200 bg-white/60 p-3 dark:border-neutral-700 dark:bg-neutral-800/60">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {label}
        </span>
        <span
          className={`text-xs ${
            hasKey
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-neutral-400 dark:text-neutral-500"
          }`}
        >
          {hasKey ? "已配置" : "未配置"}
        </span>
      </div>
      <div className="flex gap-2">
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={hasKey ? "粘贴新 key 覆盖" : "粘贴 API key"}
          disabled={busy}
          className="flex-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        />
        <button
          onClick={onSave}
          disabled={busy || !value.trim()}
          className="rounded-md bg-neutral-900 px-2 py-1 text-xs text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
        >
          保存
        </button>
        {hasKey && (
          <button
            onClick={onDelete}
            disabled={busy}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 disabled:opacity-40 dark:border-neutral-600 dark:text-neutral-200"
          >
            删除
          </button>
        )}
      </div>
      {status && (
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          {status}
        </p>
      )}
    </div>
  );
}

export function SettingsPanel() {
  const { setView } = useAppStore();
  const [status, setStatus] = useState<{ openrouter: boolean; kimi: boolean }>({
    openrouter: false,
    kimi: false,
  });

  const refresh = () => {
    keyStatus().then(setStatus);
  };

  useEffect(refresh, []);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">设置</h2>
        <button
          onClick={() => setView("main")}
          className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 dark:border-neutral-600 dark:text-neutral-200"
        >
          返回
        </button>
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        至少配置一个 provider 的 key 才能使用。Key 存在 macOS Keychain。
      </p>

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

      <PromptsSection />
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
      setStatus("已在 Finder 打开, 编辑保存后下一次优化即生效, 无需重启");
    } catch (e) {
      setStatus(`打开失败: ${String(e)}`);
    }
  };

  const onReset = async () => {
    if (!confirm("用内置默认覆盖 distill.md / code.md / product.md? 你的修改会丢失。")) return;
    setStatus(null);
    try {
      await resetDefaultPrompts();
      setStatus("已重置为内置默认");
    } catch (e) {
      setStatus(`重置失败: ${String(e)}`);
    }
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white/60 p-3 dark:border-neutral-700 dark:bg-neutral-800/60">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          Prompts (3 个 preset)
        </span>
      </div>
      <p className="mb-2 break-all text-[10px] text-neutral-400 dark:text-neutral-500">
        {dir || "..."}
      </p>
      <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
        编辑 distill.md / code.md / product.md, 保存后下次优化即生效, 无需重启或重建。
      </p>
      <div className="flex gap-2">
        <button
          onClick={onOpen}
          className="rounded-md bg-neutral-900 px-2 py-1 text-xs text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          打开 Prompts 目录
        </button>
        <button
          onClick={onReset}
          className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 dark:border-neutral-600 dark:text-neutral-200"
        >
          重置默认
        </button>
      </div>
      {status && (
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{status}</p>
      )}
    </div>
  );
}
