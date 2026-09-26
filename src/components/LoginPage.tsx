import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import logoUrl from "../../icons/icon-192.png";
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
    "w-full text-sm border border-line rounded-lg px-3 py-2.5 bg-panel focus:outline-none focus:border-blue";

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm rounded-lg border border-line bg-panel overflow-hidden">
        <div className="bg-panel-2 px-6 py-5 flex items-center gap-3">
          <img src={logoUrl} alt="WattLine 로고" className="w-12 h-12 rounded-lg shrink-0" />
          <div>
            <h1 className="font-bold text-text leading-tight">수목전지 작업관리</h1>
            <p className="text-text-soft leading-tight">배전선로 전주번호찰 추출 · 수목전지 작업 관리</p>
          </div>
        </div>

        <form onSubmit={submit} className="px-6 py-6 space-y-4">
          <div className="space-y-1">
            <label htmlFor="login-id" className="block font-semibold text-text-soft">아이디</label>
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
            <label htmlFor="login-password" className="block font-semibold text-text-soft">비밀번호</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && <p className="px-3 py-2 rounded-lg bg-red/10 text-red">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-10 rounded-lg bg-blue text-sm font-semibold text-white hover:bg-blue-hover disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            로그인
          </button>
          <p className="text-center text-text-soft">계정이 없으면 관리자에게 요청하세요.</p>
        </form>
      </div>
    </div>
  );
}
