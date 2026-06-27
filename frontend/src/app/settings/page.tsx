"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Settings {
  email: string;
  openai_api_key_masked: string | null;
  gemini_api_key_masked: string | null;
  fal_api_key_masked: string | null;
  text_model: string;
  image_model: string;
  video_model: string;
  instagram_access_token_masked: string | null;
  instagram_account_id: string;
  kakao_rest_api_key_masked: string | null;
  kakao_channel_id: string;
  has_openai: boolean;
  has_gemini: boolean;
  has_fal: boolean;
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
  const [falKey, setFalKey] = useState("");
  const [textModel, setTextModel] = useState("gemini");
  const [imageModel, setImageModel] = useState("gemini");
  const [videoModel, setVideoModel] = useState("pollinations");
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
        setTextModel(data.text_model || "gemini");
        setImageModel(data.image_model || "gemini");
        setVideoModel(data.video_model || "pollinations");
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
    if (falKey) body.fal_api_key = falKey;
    body.text_model = textModel;
    body.image_model = imageModel;
    body.video_model = videoModel;
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
      setOpenaiKey(""); setGeminiKey(""); setFalKey(""); setIgToken(""); setKakaoKey("");
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
        <h1 className="gradient-text" style={{ fontSize: "1.25rem", fontWeight: 700 }}>설정</h1>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{settings?.email}</span>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <a href="/" style={{ fontSize: "0.75rem", color: "var(--color-accent)", textDecoration: "none", padding: "3px 8px", border: "1px solid rgba(6,182,212,0.3)", borderRadius: "6px" }}>← 메인으로</a>
            <button onClick={handleLogout} style={{ fontSize: "0.75rem", color: "var(--color-error)", background: "none", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", padding: "3px 8px", cursor: "pointer" }}>로그아웃</button>
          </div>
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

          <div className="form-group">
            <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>FAL API Key <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>(Seedream 이미지 · Seedance 영상)</span></span>
              <StatusBadge active={settings?.has_fal ?? false} />
            </label>
            {settings?.fal_api_key_masked && (
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>현재: {settings.fal_api_key_masked}</p>
            )}
            <input type="password" className="form-input" placeholder="fal_key_..." value={falKey} onChange={(e) => setFalKey(e.target.value)} autoComplete="off" />
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>fal.ai 가입 시 무료 크레딧 제공 · Seedream 이미지($0.04/장) · Seedance 2.0 영상</p>
          </div>
        </div>

        {/* AI 모델 선택 */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <SectionTitle>⚙️ AI 모델 선택</SectionTitle>
          <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1.25rem" }}>
            <p style={{ fontSize: "0.8rem", color: "var(--color-success)", fontWeight: 600 }}>
              ✅ 기본값은 모두 무료 모델로 설정되어 있습니다
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              무료 모델로 먼저 생성해보고, 결과가 마음에 들지 않으면 유료 모델로 전환해 보세요.
            </p>
          </div>

          {/* 글 작성 모델 */}
          <div className="form-group">
            <label className="form-label">✍️ 홍보글 작성 모델</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {[
                { value: "gemini", label: "Google Gemini", desc: "Gemini 2.5 Flash · 무료 티어 지원", badge: "무료 추천" },
                { value: "openai", label: "OpenAI GPT-4o", desc: "더 정교한 글 · 유료 크레딧 필요", badge: "유료" },
              ].map((opt) => (
                <label key={opt.value} style={{
                  display: "flex", flexDirection: "column", gap: "0.3rem",
                  padding: "0.85rem", borderRadius: "10px", cursor: "pointer",
                  border: textModel === opt.value ? "2px solid var(--color-primary)" : "1px solid var(--border-color)",
                  background: textModel === opt.value ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.02)",
                  transition: "all 0.15s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input type="radio" name="text_model" value={opt.value} checked={textModel === opt.value} onChange={() => setTextModel(opt.value)} style={{ accentColor: "var(--color-primary)" }} />
                    <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{opt.label}</span>
                    {opt.badge && <span style={{ fontSize: "0.65rem", background: opt.value === "gemini" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.15)", color: opt.value === "gemini" ? "var(--color-success)" : "var(--color-error)", padding: "1px 6px", borderRadius: "999px", fontWeight: 700 }}>{opt.badge}</span>}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", paddingLeft: "1.4rem" }}>{opt.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 이미지 생성 모델 */}
          <div className="form-group">
            <label className="form-label">🎨 이미지 생성 모델</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[
                { value: "gemini", label: "Flux AI (Gemini 프롬프트)", desc: "API 키 불필요 · 빠른 생성 · 무료", badge: "무료 추천", badgeFree: true },
                { value: "seedream", label: "Seedream v4.5 (ByteDance)", desc: "FAL API 키 필요 · 고품질 광고 이미지 · 가입 시 무료 크레딧", badge: "FAL 키 필요", badgeFree: false },
                { value: "openai", label: "OpenAI DALL-E 3", desc: "최고 품질 이미지 · OpenAI 유료 크레딧 필요", badge: "유료", badgeFree: false },
              ].map((opt) => (
                <label key={opt.value} style={{
                  display: "flex", flexDirection: "column", gap: "0.3rem",
                  padding: "0.85rem", borderRadius: "10px", cursor: "pointer",
                  border: imageModel === opt.value ? "2px solid var(--color-secondary)" : "1px solid var(--border-color)",
                  background: imageModel === opt.value ? "rgba(168,85,247,0.1)" : "rgba(255,255,255,0.02)",
                  transition: "all 0.15s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input type="radio" name="image_model" value={opt.value} checked={imageModel === opt.value} onChange={() => setImageModel(opt.value)} style={{ accentColor: "var(--color-secondary)" }} />
                    <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{opt.label}</span>
                    {opt.badge && <span style={{ fontSize: "0.65rem", background: opt.badgeFree ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.15)", color: opt.badgeFree ? "var(--color-success)" : "var(--color-error)", padding: "1px 6px", borderRadius: "999px", fontWeight: 700 }}>{opt.badge}</span>}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", paddingLeft: "1.4rem" }}>{opt.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 영상 생성 모델 */}
          <div className="form-group">
            <label className="form-label">🎬 영상 생성 모델</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[
                { value: "pollinations", label: "이미지 기반 프리뷰", desc: "API 불필요 · Ken Burns 애니메이션 · 다운로드 가능", badge: "무료 추천", free: true, disabled: false },
                { value: "seedance", label: "Seedance 2.0 (ByteDance)", desc: "FAL API 키 필요 · 고품질 AI 영상 5초 · 9:16 세로 포맷 · 가입 시 무료 크레딧", badge: "FAL 키 필요", free: false, disabled: false },
                { value: "veo3", label: "Veo 3 (Google)", desc: "Gemini API 필요 · 고품질 AI 영상 8초 · Google AI Ultra 플랜($249/월)", badge: "유료", free: false, disabled: false },
                { value: "runway", label: "Runway Gen-3", desc: "Runway API 키 필요 · 고품질 AI 영상 · 연동 예정", badge: "준비 중", free: false, disabled: true },
              ].map((opt) => (
                <label key={opt.value} style={{
                  display: "flex", flexDirection: "column", gap: "0.3rem",
                  padding: "0.85rem", borderRadius: "10px", cursor: opt.disabled ? "not-allowed" : "pointer",
                  border: videoModel === opt.value ? "2px solid var(--color-accent)" : "1px solid var(--border-color)",
                  background: videoModel === opt.value ? "rgba(6,182,212,0.08)" : "rgba(255,255,255,0.02)",
                  opacity: opt.disabled ? 0.6 : 1,
                  transition: "all 0.15s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                      type="radio" name="video_model" value={opt.value}
                      checked={videoModel === opt.value}
                      onChange={() => !opt.disabled && setVideoModel(opt.value)}
                      disabled={opt.disabled}
                      style={{ accentColor: "var(--color-accent)" }}
                    />
                    <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{opt.label}</span>
                    <span style={{
                      fontSize: "0.65rem",
                      background: opt.free ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.15)",
                      color: opt.free ? "var(--color-success)" : "var(--color-error)",
                      padding: "1px 6px", borderRadius: "999px", fontWeight: 700,
                    }}>{opt.badge}</span>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", paddingLeft: "1.4rem" }}>{opt.desc}</span>
                </label>
              ))}
            </div>
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
