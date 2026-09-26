import React, { useEffect, useState } from "react";
import { X, KeyRound } from "lucide-react";
import { AppSettings, ProviderId } from "../lib/settings";

interface SettingsPanelProps {
  isOpen: boolean;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onClose: () => void;
}

const PROVIDER_LABELS: Record<ProviderId, string> = {
  gemini: "Gemini",
  claude: "Claude",
  openai: "OpenAI",
};

export default function SettingsPanel({ isOpen, settings, onSave, onClose }: SettingsPanelProps) {
  const [provider, setProvider] = useState<ProviderId>(settings.selectedProvider);
  const [keyValue, setKeyValue] = useState(settings.keys[settings.selectedProvider]);

  useEffect(() => {
    if (isOpen) {
      setProvider(settings.selectedProvider);
      setKeyValue(settings.keys[settings.selectedProvider]);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleProviderChange = (next: ProviderId) => {
    setProvider(next);
    setKeyValue(settings.keys[next]);
  };

  const handleSave = () => {
    onSave({
      selectedProvider: provider,
      keys: { ...settings.keys, [provider]: keyValue },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-navy text-sm flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            AI 설정
          </h2>
          <button onClick={onClose} className="text-text3 hover:text-text2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {(Object.keys(PROVIDER_LABELS) as ProviderId[]).map((id) => (
            <label key={id} className="flex items-center gap-2 text-sm text-text2 cursor-pointer">
              <input
                type="radio"
                name="provider"
                checked={provider === id}
                onChange={() => handleProviderChange(id)}
              />
              {PROVIDER_LABELS[id]}
            </label>
          ))}
        </div>

        <label className="block text-xs font-semibold text-text3 mb-1">
          {PROVIDER_LABELS[provider]} API 키
        </label>
        <input
          type="password"
          value={keyValue}
          onChange={(e) => setKeyValue(e.target.value)}
          placeholder="API 키를 입력하세요"
          className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm outline-none focus:border-navy-light"
        />

        <p className="text-[11px] text-text3 mt-2 leading-relaxed">
          입력한 키는 이 브라우저에만 저장되고, 분석할 때만 서버로 전달되며 서버에는 저장되지 않습니다.
        </p>

        <button
          onClick={handleSave}
          className="w-full mt-4 bg-navy hover:bg-navy-dark text-white font-bold text-sm py-2 rounded-md transition-colors"
        >
          저장
        </button>
      </div>
    </div>
  );
}
