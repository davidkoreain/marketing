"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Settings {
  email: string;
  openai_api_key_masked: string | null;
  gemini_api_key_masked: string | null;
  instagram_access_token_masked: string | null;
  instagram_account_id: string;
  kakao_rest_api_key_masked: string | null;
  kakao_channel_id: string;
  has_openai: boolean;
  has_gemini: boolean;
  has_instagram: boolean;
  has_kakao: boolean;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border-color)" }}>
      {children}
    </h2>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span style={{
      fontSize: "0.7rem",
      padding: "2px 8px",
      borderRadius: "999px",
      background: active ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
      color: active ? "var(--color-success)" : "var(--color-error)",
      fontWeight: 600,
    }}>
      {active ? "연결됨" : "미연결"}
    </span>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [igToken, setIgToken] = useState("");
  const [igAccountId, setIgAccountId] = useState("");
  const [kakaoKey, setKakaoKey] = useState("");
  const [kakaoChannelId, setKakaoChannelId] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetch(`${API_BASE_URL}/api/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setIgAccountId(data.instagram_account_id || "");
        setKakaoChannelId(data.kakao_channel_id || "");
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const token = localStorage.getItem("token");
    const body: Record<string, string> = {};
    if (openaiKey) body.openai_api_key = openaiKey;
    if (geminiKey) body.gemini_api_key = geminiKey;
    if (igToken) body.instagram_access_token = igToken;
    if (igAccountId !== undefined) body.instagram_account_id = igAccountId;
    if (kakaoKey) body.kakao_rest_api_key = kakaoKey;
    if (kakaoChannelId !== undefined) body.kakao_channel_id = kakaoChannelId;

    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.detail || "저장 실패"); return; }
      setMessage("설정이 저장되었습니다.");
      setSettings((prev) => prev ? { ...prev, ...data } : prev);
      setOpenaiKey(""); setGeminiKey(""); setIgToken(""); setKakaoKey("");
    } catch {
      setMessage("서버 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    router.push("/login");
  }

  if (loading) return (
    <main className="app-container">
      <div className="glass-card" style={{ padding: "2rem", textAlign: "center" }}>
        <p className="subheading">설정을 불러오는 중...</p>
      </div>
    </main>
  );

  return (
    <main className="app-container">
      {/* 헤더 */}
      <header className="glass-card" style={{ padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: "1.25rem", fontWeight: 700 }}>설정</h1>
          <p className="subheading" style={{ fontSize: "0.8rem" }}>{settings?.email}</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <Link href="/" style={{ color: "var(--color-accent)", fontSize: "0.875rem", textDecoration: "none" }}>
            ← 메인으로
          </Link>
          <button onClick={handleLogout} className="btn" style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem", background: "rgba(239,68,68,0.15)", color: "var(--color-error)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px" }}>
            로그아웃
          </button>
        </div>
      </header>

      <form onSubmit={handleSave}>
        {/* AI API 키 설정 */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <SectionTitle>🤖 AI 설정</SectionTitle>
          <p className="subheading" style={{ fontSize: "0.8rem", marginBottom: "1.25rem" }}>
            홍보글·이미지 생성에 사용됩니다. OpenAI 또는 Gemini 중 하나 이상 입력하세요.
          </p>

          <div className="form-group">
            <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>OpenAI API Key <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>(GPT-4o + DALL-E 3)</span></span>
              <StatusBadge active={settings?.has_openai ?? false} />
            </label>
            {settings?.openai_api_key_masked && (
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>현재: {settings.openai_api_key_masked}</p>
            )}
            <input type="password" className="form-input" placeholder="sk-..." value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} autoComplete="off" />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Google Gemini API Key <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>(무료 티어 가능)</span></span>
              <StatusBadge active={settings?.has_gemini ?? false} />
            </label>
            {settings?.gemini_api_key_masked && (
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>현재: {settings.gemini_api_key_masked}</p>
            )}
            <input type="password" className="form-input" placeholder="AIzaSy..." value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} autoComplete="off" />
          </div>
        </div>

        {/* 인스타그램 연동 */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <SectionTitle>📸 인스타그램 연동</SectionTitle>
          <p className="subheading" style={{ fontSize: "0.8rem", marginBottom: "1.25rem" }}>
            Meta Business Suite에서 발급한 액세스 토큰과 Instagram 비즈니스 계정 ID가 필요합니다.
          </p>

          <div className="form-group">
            <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Instagram Access Token</span>
              <StatusBadge active={settings?.has_instagram ?? false} />
            </label>
            {settings?.instagram_access_token_masked && (
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>현재: {settings.instagram_access_token_masked}</p>
            )}
            <input type="password" className="form-input" placeholder="EAAxxxxxxx..." value={igToken} onChange={(e) => setIgToken(e.target.value)} autoComplete="off" />
          </div>

          <div className="form-group">
            <label className="form-label">Instagram 비즈니스 계정 ID</label>
            <input type="text" className="form-input" placeholder="17841xxxxxxxxxx" value={igAccountId} onChange={(e) => setIgAccountId(e.target.value)} />
          </div>
        </div>

        {/* 카카오톡 채널 연동 */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <SectionTitle>💬 카카오톡 채널 연동</SectionTitle>
          <p className="subheading" style={{ fontSize: "0.8rem", marginBottom: "1.25rem" }}>
            카카오 디벨로퍼스에서 발급한 REST API 키와 카카오톡 채널 ID가 필요합니다.
          </p>

          <div className="form-group">
            <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>카카오 REST API 키</span>
              <StatusBadge active={settings?.has_kakao ?? false} />
            </label>
            {settings?.kakao_rest_api_key_masked && (
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>현재: {settings.kakao_rest_api_key_masked}</p>
            )}
            <input type="password" className="form-input" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={kakaoKey} onChange={(e) => setKakaoKey(e.target.value)} autoComplete="off" />
          </div>

          <div className="form-group">
            <label className="form-label">카카오톡 채널 ID</label>
            <input type="text" className="form-input" placeholder="@내채널아이디" value={kakaoChannelId} onChange={(e) => setKakaoChannelId(e.target.value)} />
          </div>
        </div>

        {/* 저장 버튼 */}
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          {message && (
            <p style={{ textAlign: "center", marginBottom: "0.75rem", fontSize: "0.875rem", color: message.includes("저장") ? "var(--color-success)" : "var(--color-error)" }}>
              {message}
            </p>
          )}
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={saving}>
            {saving ? "저장 중..." : "설정 저장"}
          </button>
        </div>
      </form>
    </main>
  );
}
