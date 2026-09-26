import React, { useState } from "react";
import { Cpu, Loader2 } from "lucide-react";
import { AuthUser, login } from "../lib/auth";

export default function LoginPage({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !password) return setError("아이디와 비밀번호를 입력하세요.");
    setSubmitting(true);
    setError(null);
    try {
      onLogin(await login(loginId.trim(), password));
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full text-sm border border-border rounded-md px-3 py-2.5 bg-surface focus:outline-none focus:border-navy-light";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="bg-navy px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber rounded-lg flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white leading-tight">AI 전주번호찰 선로 정보 추출기</h1>
            <p className="text-white/60 leading-tight">배전선로 전주번호찰 추출 · 수목전지 작업 관리</p>
          </div>
        </div>

        <form onSubmit={submit} className="px-6 py-6 space-y-4">
          <div className="space-y-1">
            <label htmlFor="login-id" className="block font-semibold text-text2">아이디</label>
            <input
              id="login-id"
              autoFocus
              autoComplete="username"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="login-password" className="block font-semibold text-text2">비밀번호</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && <p className="px-3 py-2 rounded-md bg-red/10 text-red">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-10 rounded-md bg-navy text-sm font-semibold text-white hover:bg-navy-dark disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            로그인
          </button>
          <p className="text-center text-text3">계정이 없으면 관리자에게 요청하세요.</p>
        </form>
      </div>
    </div>
  );
}
