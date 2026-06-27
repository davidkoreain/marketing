"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Stepper from "../components/Stepper";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SoMaBiPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    setUserEmail(localStorage.getItem("email"));
    // 저장된 세션 확인
    try {
      const raw = localStorage.getItem("somabi_session");
      if (raw) setSavedSession(JSON.parse(raw));
    } catch {}
  }, [router]);

  function getAuthHeader() {
    return { Authorization: `Bearer ${localStorage.getItem("token") || ""}` };
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    router.push("/login");
  }

  const [currentStage, setCurrentStage] = useState<"input" | "post" | "image" | "video" | "publish" | "done">("input");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<string>("");

  // Input Stage Form Data
  const [formData, setFormData] = useState({
    product_name: "",
    product_desc: "",
    keywords: "",
    target_audience: "2030 직장인",
    tone_and_manner: "친근하고 활기찬",
  });

  // Generated Content State
  const [generatedPost, setGeneratedPost] = useState<string | null>(null);
  const [generatedImagePrompt, setGeneratedImagePrompt] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedVideoScript, setGeneratedVideoScript] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  // Multi-Agent State
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [publishChannels, setPublishChannels] = useState<string[]>(["instagram", "kakaotalk"]);
  const [publishResults, setPublishResults] = useState<Record<string, string>>({});
  const [rejectCount, setRejectCount] = useState(0);
  const [savedSession, setSavedSession] = useState<any>(null);
  const [saveMsg, setSaveMsg] = useState("");
  const [activeTextModel, setActiveTextModel] = useState<string>("gemini");
  const [activeImageModel, setActiveImageModel] = useState<string>("gemini");
  const [activeVideoModel, setActiveVideoModel] = useState<string>("pollinations");
  const [maxReachedStage, setMaxReachedStage] = useState<typeof currentStage>("input");
  const [videoError, setVideoError] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  // 단계 전진 (뒤로 가기와 달리 maxReachedStage도 갱신)
  const STAGE_ORDER = ["input", "post", "image", "video", "publish", "done"] as const;
  function advanceStage(stage: typeof currentStage) {
    setCurrentStage(stage);
    setMaxReachedStage((prev) => {
      return STAGE_ORDER.indexOf(stage) > STAGE_ORDER.indexOf(prev) ? stage : prev;
    });
  }

  // Form input change handler
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Start Session (Step 1 -> Step 2)
  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_name || !formData.product_desc) {
      setError("상품명과 상품 설명을 입력해 주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentAgent("카피라이터 에이전트"); // 시각적으로 피드백 주기 위해 즉시 설정

    try {
      const response = await fetch(`${API_BASE_URL}/api/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`서버 오류 (${response.status}): ${errData.detail || response.statusText || "알 수 없는 오류"}`);
      }

      const data = await response.json();
      setThreadId(data.thread_id);

      const stateValues = data.state;
      setGeneratedPost(stateValues.generated_post);
      setCurrentAgent(stateValues.current_agent || "카피라이터 에이전트");
      setActiveTextModel(stateValues.text_model || "gemini");
      setActiveImageModel(stateValues.image_model || "gemini");
      setActiveVideoModel(stateValues.video_model || "pollinations");
      setSessionExpired(false);
      advanceStage("post");
      // 자동 저장 (로컬 + 서버)
      localStorage.setItem("somabi_session", JSON.stringify({
        savedAt: new Date().toLocaleString("ko-KR"),
        currentStage: "post", threadId: data.thread_id, formData,
        generatedPost: stateValues.generated_post,
        generatedImagePrompt: null, generatedImageUrl: null,
        generatedVideoScript: null, generatedVideoUrl: null,
      }));
      saveCampaignToServer({
        thread_id: data.thread_id,
        stage: "post",
        product_name: formData.product_name,
        product_desc: formData.product_desc,
        keywords: formData.keywords,
        target_audience: formData.target_audience,
        tone_and_manner: formData.tone_and_manner,
        generated_post: stateValues.generated_post,
        text_model: stateValues.text_model,
        image_model: stateValues.image_model,
      });
    } catch (err: any) {
      setError(err.message || "세션을 시작하는 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Process Feedback (Approve/Reject)
  const handleFeedback = async (action: "approve" | "reject") => {
    if (!threadId) return;
    if (action === "reject" && !feedbackText.trim()) {
      setError("반려 시에는 피드백 의견을 입력해 주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    
    // Set appropriate loading agent
    if (action === "approve") {
      if (currentStage === "post") setCurrentAgent("디자이너 에이전트");
      else if (currentStage === "image") setCurrentAgent("영상 편집자 에이전트");
    } else {
      // Rejections keep the same agent working
      if (currentStage === "post") setCurrentAgent("카피라이터 에이전트");
      else if (currentStage === "image") setCurrentAgent("디자이너 에이전트");
      else if (currentStage === "video") setCurrentAgent("영상 편집자 에이전트");
    }

    try {
      const payload = {
        thread_id: threadId,
        stage: currentStage,
        action,
        feedback: action === "reject" ? feedbackText : undefined,
      };

      const response = await fetch(`${API_BASE_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          setSessionExpired(true);
          throw new Error("서버가 재시작되어 세션이 만료되었습니다. 아래 버튼으로 복원하세요.");
        }
        throw new Error(`피드백 전송 실패 (${response.status}): ${errData.detail || response.statusText || "알 수 없는 오류"}`);
      }

      const data = await response.json();
      const stateValues = data.state;
      const nextSteps = data.next;

      // Update generated contents from new state
      setGeneratedPost(stateValues.generated_post);
      setGeneratedImagePrompt(stateValues.generated_image_prompt);
      setGeneratedImageUrl(stateValues.generated_image_url);
      setGeneratedVideoScript(stateValues.generated_video_script);
      if (stateValues.generated_video_url !== generatedVideoUrl) {
        setVideoError(false);
      }
      setGeneratedVideoUrl(stateValues.generated_video_url);
      if (stateValues.video_model) setActiveVideoModel(stateValues.video_model);
      setCurrentAgent(stateValues.current_agent || null);

      // Clear feedback input
      setFeedbackText("");

      // 자동 저장 (로컬 + 서버)
      const nextStage = action === "approve"
        ? (currentStage === "post" && nextSteps.includes("image_review") ? "image"
          : currentStage === "image" && nextSteps.includes("video_review") ? "video"
          : currentStage === "video" && data.is_finished ? "publish"
          : currentStage)
        : currentStage;
      localStorage.setItem("somabi_session", JSON.stringify({
        savedAt: new Date().toLocaleString("ko-KR"),
        currentStage: nextStage, threadId, formData,
        generatedPost: stateValues.generated_post,
        generatedImagePrompt: stateValues.generated_image_prompt,
        generatedImageUrl: stateValues.generated_image_url,
        generatedVideoScript: stateValues.generated_video_script,
        generatedVideoUrl: stateValues.generated_video_url,
      }));
      saveCampaignToServer({
        thread_id: threadId,
        stage: nextStage,
        product_name: formData.product_name,
        product_desc: formData.product_desc,
        keywords: formData.keywords,
        target_audience: formData.target_audience,
        tone_and_manner: formData.tone_and_manner,
        generated_post: stateValues.generated_post,
        generated_image_prompt: stateValues.generated_image_prompt,
        generated_image_url: stateValues.generated_image_url,
        generated_video_script: stateValues.generated_video_script,
        generated_video_url: stateValues.generated_video_url,
        text_model: stateValues.text_model,
        image_model: stateValues.image_model,
      });

      if (action === "approve") {
        setRejectCount(0);
        if (currentStage === "post" && nextSteps.includes("image_review")) {
          advanceStage("image");
        } else if (currentStage === "image" && nextSteps.includes("video_review")) {
          setVideoError(false);
          advanceStage("video");
        } else if (currentStage === "video" && data.is_finished) {
          advanceStage("publish");
        }
      } else {
        setRejectCount((c) => c + 1);
      }
    } catch (err: any) {
      setError(err.message || "피드백 처리 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Final Publish handler (Step 5 -> Step 6)
  const handlePublish = async () => {
    if (!threadId) return;
    if (publishChannels.length === 0) {
      setError("배포할 채널을 최소 하나 이상 선택해 주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentAgent("배포 에이전트");

    try {
      const payload = {
        thread_id: threadId,
        publish_channels: publishChannels,
      };

      const response = await fetch(`${API_BASE_URL}/api/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`배포 처리 실패 (${response.status}): ${errData.detail || response.statusText || "알 수 없는 오류"}`);
      }

      const data = await response.json();

      setPublishResults(data.publish_results || {});
      setCurrentAgent("배포 에이전트");
      advanceStage("done");
      // 최종 배포 결과를 서버에 저장
      saveCampaignToServer({
        thread_id: threadId,
        stage: "done",
        publish_channels: JSON.stringify(publishChannels),
        publish_results: JSON.stringify(data.publish_results || {}),
      });
    } catch (err: any) {
      setError(err.message || "배포 처리 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Channel Checkbox Change
  const handleChannelChange = (channel: string) => {
    setPublishChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  // Reset Session
  const handleReset = () => {
    setThreadId(null);
    setCurrentStage("input");
    setFormData({
      product_name: "",
      product_desc: "",
      keywords: "",
      target_audience: "2030 직장인",
      tone_and_manner: "친근하고 활기찬",
    });
    setGeneratedPost(null);
    setGeneratedImagePrompt(null);
    setGeneratedImageUrl(null);
    setGeneratedVideoScript(null);
    setGeneratedVideoUrl(null);
    setCurrentAgent(null);
    setPublishChannels(["instagram", "kakaotalk"]);
    setPublishResults({});
    setFeedbackText("");
    setRejectCount(0);
    setError(null);
    setMaxReachedStage("input");
    setSessionExpired(false);
    localStorage.removeItem("somabi_session");
    setSavedSession(null);
  };

  // 서버에 캠페인 저장 (upsert, thread_id 기준)
  async function saveCampaignToServer(fields: Record<string, any>) {
    try {
      await fetch(`${API_BASE_URL}/api/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(fields),
      });
    } catch {
      // 서버 저장 실패는 조용히 처리 (로컬 저장은 항상 유지)
    }
  }

  // 세션 저장 (로컬 + 서버 동시)
  function saveSession() {
    const data = {
      savedAt: new Date().toLocaleString("ko-KR"),
      currentStage, threadId, formData,
      generatedPost, generatedImagePrompt, generatedImageUrl,
      generatedVideoScript, generatedVideoUrl,
    };
    localStorage.setItem("somabi_session", JSON.stringify(data));
    setSaveMsg("저장되었습니다!");
    setTimeout(() => setSaveMsg(""), 2000);
    // 서버 동기화
    saveCampaignToServer({
      thread_id: threadId,
      stage: currentStage,
      product_name: formData.product_name,
      product_desc: formData.product_desc,
      keywords: formData.keywords,
      target_audience: formData.target_audience,
      tone_and_manner: formData.tone_and_manner,
      generated_post: generatedPost,
      generated_image_prompt: generatedImagePrompt,
      generated_image_url: generatedImageUrl,
      generated_video_script: generatedVideoScript,
      generated_video_url: generatedVideoUrl,
    });
  }

  // 세션 복원
  function restoreSession(data: any) {
    if (data.formData) setFormData(data.formData);
    if (data.threadId) setThreadId(data.threadId);
    if (data.generatedPost) setGeneratedPost(data.generatedPost);
    if (data.generatedImagePrompt) setGeneratedImagePrompt(data.generatedImagePrompt);
    if (data.generatedImageUrl) setGeneratedImageUrl(data.generatedImageUrl);
    if (data.generatedVideoScript) setGeneratedVideoScript(data.generatedVideoScript);
    if (data.generatedVideoUrl) setGeneratedVideoUrl(data.generatedVideoUrl);
    if (data.currentStage) {
      setCurrentStage(data.currentStage);
      setMaxReachedStage(data.currentStage);
    }
    setSavedSession(null);
  }

  // 모델 배지 컴포넌트
  function ModelBadge({ type }: { type: "text" | "image" | "video" }) {
    let label: string;
    let isPaid: boolean;

    if (type === "text") {
      isPaid = activeTextModel === "openai";
      label = isPaid ? "GPT-4o · 유료" : "Gemini 2.5 Flash · 무료";
    } else if (type === "image") {
      isPaid = activeImageModel === "openai";
      label = isPaid ? "DALL-E 3 · 유료" : "Gemini / Flux AI · 무료";
    } else {
      isPaid = activeVideoModel === "runway";
      label = isPaid ? "Runway Gen-3 · 유료" : "Pollinations.ai · 무료";
    }

    return (
      <span style={{
        fontSize: "0.7rem",
        padding: "0.22rem 0.55rem",
        borderRadius: "5px",
        fontWeight: 600,
        background: isPaid ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
        color: isPaid ? "#f87171" : "#34d399",
        border: `1px solid ${isPaid ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
        whiteSpace: "nowrap",
      }}>
        {isPaid ? "🔴" : "🟢"} {label}
      </span>
    );
  }

  // 저장 버튼 컴포넌트
  const SaveButton = () => (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      {saveMsg && <span style={{ fontSize: "0.7rem", color: "var(--color-success)" }}>{saveMsg}</span>}
      <button
        onClick={saveSession}
        style={{
          fontSize: "0.7rem", padding: "0.25rem 0.6rem", cursor: "pointer",
          background: "rgba(16,185,129,0.15)", color: "var(--color-success)",
          border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px",
        }}
      >
        💾 저장
      </button>
    </div>
  );

  // 반려 후 유료 모델 업그레이드 제안 배너
  const upgradeBanner = rejectCount >= 1 ? (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem",
      background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)",
      borderRadius: "10px", padding: "0.75rem 1rem", marginBottom: "0.75rem",
    }}>
      <div>
        <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-primary)" }}>
          💡 결과물이 마음에 들지 않으시나요?
        </p>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
          {currentStage === "post"
            ? `현재 ${activeTextModel === "gemini" ? "Gemini(무료)" : "GPT-4o(유료)"} 사용 중. ${activeTextModel === "gemini" ? "GPT-4o로 전환하면 더 정교한 마케팅 글을 생성할 수 있어요." : "더 많은 피드백을 시도해 보세요."}`
            : currentStage === "image"
            ? `현재 ${activeImageModel === "gemini" ? "Flux AI(무료)" : "DALL-E 3(유료)"} 사용 중. ${activeImageModel === "gemini" ? "DALL-E 3로 전환하면 더 고품질 이미지를 생성할 수 있어요." : "더 많은 피드백을 시도해 보세요."}`
            : `현재 Pollinations.ai(무료) 사용 중. Runway Gen-3 등 유료 AI 영상 연동이 곧 추가됩니다. 지금은 대본을 CapCut·Canva에서 활용해 보세요.`}
        </p>
      </div>
      <Link href="/settings" style={{
        fontSize: "0.75rem", color: "white", textDecoration: "none",
        background: "var(--color-primary)", padding: "0.4rem 0.75rem",
        borderRadius: "6px", whiteSpace: "nowrap", flexShrink: 0,
      }}>
        ⚙️ 모델 설정
      </Link>
    </div>
  ) : null;

  return (
    <main className="app-container">
      {/* 헤더 */}
      <header className="glass-card" style={{ padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="gradient-text heading-lg">소마비 SoMaBi</h1>
          <p className="subheading" style={{ fontSize: "0.8rem" }}>소상공인 초간편 SNS 마케팅 자동화 비서</p>
        </div>
        {userEmail && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{userEmail}</span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Link href="/settings" style={{ fontSize: "0.75rem", color: "var(--color-accent)", textDecoration: "none", padding: "3px 8px", border: "1px solid rgba(6,182,212,0.3)", borderRadius: "6px" }}>
                ⚙ 설정
              </Link>
              <button onClick={handleLogout} style={{ fontSize: "0.75rem", color: "var(--color-error)", background: "none", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", padding: "3px 8px", cursor: "pointer" }}>
                로그아웃
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 진행 상황 바 */}
      <div className="glass-card" style={{ padding: "1rem 1.5rem" }}>
        <Stepper
          currentStage={currentStage}
          maxReachedStage={maxReachedStage}
          onStepClick={(stage) => {
            const order = ["input", "post", "image", "video", "publish", "done"];
            if (order.indexOf(stage) <= order.indexOf(maxReachedStage)) {
              setCurrentStage(stage as typeof currentStage);
            }
          }}
        />
      </div>

      {/* 에러 메시지 표시 */}
      {error && (
        <div 
          className="glass-card fade-in" 
          style={{ 
            borderColor: "rgba(239, 68, 68, 0.4)", 
            background: "rgba(239, 68, 68, 0.1)",
            color: "#f87171",
            padding: "1rem"
          }}
        >
          <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>⚠️ 에러 발생</p>
          <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>{error}</p>
        </div>
      )}

      {/* 세션 만료 복원 배너 (Render 재시작으로 MemorySaver 소실 시) */}
      {sessionExpired && (
        <div className="glass-card fade-in" style={{ borderColor: "rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.08)", padding: "1rem 1.25rem" }}>
          <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--color-warning)" }}>
            ⏱️ 서버 세션이 만료되었습니다
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0.35rem 0 0.75rem" }}>
            Render 무료 서버는 15분 비활성 시 재시작됩니다. 저장된 상품 정보로 세션을 자동 복원합니다.
          </p>
          <button
            onClick={async (e) => {
              setSessionExpired(false);
              setError(null);
              setCurrentStage("input");
              setMaxReachedStage("input");
              // formData가 남아있으면 자동으로 재시작
              if (formData.product_name && formData.product_desc) {
                await handleStartSession(e as any);
              }
            }}
            style={{ fontSize: "0.8rem", padding: "0.45rem 1rem", background: "var(--color-warning)", color: "#000", border: "none", borderRadius: "7px", fontWeight: 700, cursor: "pointer" }}
          >
            🔄 세션 복원 시도
          </button>
          <button
            onClick={() => { setSessionExpired(false); setError(null); handleReset(); }}
            style={{ fontSize: "0.8rem", padding: "0.45rem 0.8rem", background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border-color)", borderRadius: "7px", cursor: "pointer", marginLeft: "0.5rem" }}
          >
            처음부터 시작
          </button>
        </div>
      )}

      {/* 저장된 세션 복원 배너 */}
      {savedSession && currentStage === "input" && (
        <div className="glass-card fade-in" style={{ borderColor: "rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.08)", padding: "1rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <div>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-primary)" }}>
              💾 이전 작업이 저장되어 있습니다
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              저장 시각: {savedSession.savedAt} · {
                savedSession.currentStage === "post" ? "홍보글 단계" :
                savedSession.currentStage === "image" ? "이미지 단계" :
                savedSession.currentStage === "video" ? "영상 단계" :
                savedSession.currentStage === "publish" ? "배포 단계" : "정보 입력"
              }
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
            <button
              onClick={() => restoreSession(savedSession)}
              style={{ fontSize: "0.8rem", padding: "0.4rem 0.9rem", cursor: "pointer", background: "var(--color-primary)", color: "white", border: "none", borderRadius: "7px", fontWeight: 600 }}
            >
              이어서 하기
            </button>
            <button
              onClick={() => { localStorage.removeItem("somabi_session"); setSavedSession(null); }}
              style={{ fontSize: "0.8rem", padding: "0.4rem 0.7rem", cursor: "pointer", background: "rgba(239,68,68,0.12)", color: "var(--color-error)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "7px" }}
            >
              삭제
            </button>
          </div>
        </div>
      )}

      {/* 메인 작업 영역 */}
      <div className="glass-card fade-in" key={currentStage}>
        {/* [1단계] 정보 입력 폼 */}
        {currentStage === "input" && (
          <form onSubmit={handleStartSession}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 className="gradient-text" style={{ fontSize: "1.25rem" }}>
                📢 상품 정보 입력
              </h2>
              <SaveButton />
            </div>
            <p className="subheading" style={{ marginBottom: "1.5rem" }}>
              홍보하고자 하는 상품/이벤트 정보를 기입해 주시면 AI가 SNS 마케팅 콘텐츠 기획을 시작합니다.
            </p>

            <div className="form-group">
              <label className="form-label">상품명</label>
              <input
                type="text"
                name="product_name"
                value={formData.product_name}
                onChange={handleInputChange}
                className="form-input"
                placeholder="예: 수제 딸기 생크림 케이크"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">상품 설명 및 특징</label>
              <textarea
                name="product_desc"
                value={formData.product_desc}
                onChange={handleInputChange}
                className="form-textarea"
                placeholder="예: 100% 국산 딸기와 고소한 동물성 생크림을 사용해 촉촉하고 달콤합니다. 매일 아침 한정 수량만 만듭니다."
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>핵심 키워드 / 해시태그</span>
                <span className="subheading" style={{ fontSize: "0.75rem" }}>선택 입력</span>
              </label>
              <input
                type="text"
                name="keywords"
                value={formData.keywords}
                onChange={handleInputChange}
                className="form-input"
                placeholder="예: #감성카페 #신메뉴출시 #한정수량 (스페이스로 구분)"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">타겟 고객층</label>
              <input
                type="text"
                name="target_audience"
                value={formData.target_audience}
                onChange={handleInputChange}
                className="form-input"
                placeholder="예: 디저트를 사랑하는 2030 여성, 특별한 기념일을 앞둔 연인"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">브랜드 톤앤매너</label>
              <select
                name="tone_and_manner"
                value={formData.tone_and_manner}
                onChange={handleInputChange}
                className="form-select"
                disabled={loading}
              >
                <option value="친근하고 활기찬">친근하고 활기찬 (이모지 가득, 밝은 느낌)</option>
                <option value="감성적이고 따뜻한">감성적이고 따뜻한 (차분함, 감성 문구)</option>
                <option value="전문적이고 신뢰감 있는">전문적이고 신뢰감 있는 (정중함, 정보 강조)</option>
                <option value="유머러스하고 트렌디한">유머러스하고 트렌디한 (유행어, 드립 활용)</option>
              </select>
            </div>

            <button
              type="submit"
              className={`btn btn-primary ${loading ? "btn-disabled" : ""}`}
              disabled={loading}
              style={{ marginTop: "1rem" }}
            >
              {loading ? (
                <>
                  <div className="spinner" /> 🧑‍💻 카피라이터 에이전트가 글을 작성 중...
                </>
              ) : (
                "AI 마케팅 콘텐츠 생성 시작"
              )}
            </button>
          </form>
        )}

        {/* [2단계] 홍보글 검토 */}
        {currentStage === "post" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
              <div>
                <h2 className="gradient-text" style={{ fontSize: "1.25rem", marginBottom: "0.35rem" }}>
                  ✍️ [1단계] SNS 홍보글 검토
                </h2>
                <ModelBadge type="text" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0, marginTop: "0.15rem" }}>
                <SaveButton />
                <span className="subheading" style={{ fontSize: "0.75rem", background: "rgba(99, 102, 241, 0.15)", color: "var(--color-primary)", padding: "0.25rem 0.5rem", borderRadius: "0.25rem", fontWeight: 700 }}>
                  🤖 카피라이터 에이전트
                </span>
              </div>
            </div>
            <p className="subheading" style={{ marginBottom: "1.5rem" }}>
              생성된 글을 확인해 보세요. 마음에 들지 않는 부분을 피드백하면 실시간으로 반영하여 고쳐 드립니다.
            </p>

            {/* 인스타그램 & 카카오톡 프리뷰 카드 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
              <div className="instagram-mockup">
                <div className="insta-header">
                  <div className="insta-avatar">So</div>
                  <div className="insta-username">somabi_marketing</div>
                </div>
                <div className="insta-caption-area" style={{ marginTop: "0.75rem" }}>
                  <div className="insta-caption-text">{generatedPost}</div>
                </div>
              </div>

              <div className="kakao-mockup">
                <div className="kakao-chat-bubble">
                  <div className="kakao-avatar">소마비</div>
                  <div className="kakao-message-content">
                    <div className="kakao-name">소마비 채널 알림</div>
                    <div className="kakao-bubble-body">
                      <div className="kakao-post-body">{generatedPost}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 피드백 입력 폼 */}
            <div className="form-group">
              <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>수정 의견 전달 (반려 시 필수)</span>
                <span className="subheading" style={{ fontSize: "0.75rem" }}>자연어로 입력 가능</span>
              </label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="form-textarea"
                placeholder="예: 해시태그에 #신상디저트 #인생생크림 추가해 주고, 전체적으로 톤을 좀 더 차분하게 수정해 줘."
                disabled={loading}
              />
            </div>

            {upgradeBanner}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1.5rem" }}>
              <button
                type="button"
                onClick={() => handleFeedback("reject")}
                className={`btn btn-reject ${loading ? "btn-disabled" : ""}`}
                disabled={loading}
              >
                {loading ? <div className="spinner" /> : "수정 요청 (반려)"}
              </button>
              <button
                type="button"
                onClick={() => handleFeedback("approve")}
                className={`btn btn-primary ${loading ? "btn-disabled" : ""}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner" /> 디자이너 준비 중...
                  </>
                ) : (
                  "글 확정 및 이미지 단계 이동"
                )}
              </button>
            </div>
          </div>
        )}

        {/* [3단계] 홍보 이미지 검토 */}
        {currentStage === "image" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
              <div>
                <h2 className="gradient-text" style={{ fontSize: "1.25rem", marginBottom: "0.35rem" }}>
                  🎨 [2단계] 홍보 이미지 검토
                </h2>
                <ModelBadge type="image" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0, marginTop: "0.15rem" }}>
                <SaveButton />
                <span className="subheading" style={{ fontSize: "0.75rem", background: "rgba(168, 85, 247, 0.15)", color: "var(--color-secondary)", padding: "0.25rem 0.5rem", borderRadius: "0.25rem", fontWeight: 700 }}>
                  🤖 디자이너 에이전트
                </span>
              </div>
            </div>
            <p className="subheading" style={{ marginBottom: "1.5rem" }}>
              홍보글과 어울리는 이미지를 생성했습니다. 구도나 요소를 바꾸고 싶다면 피드백 의견을 전달해 주세요.
            </p>

            {/* 이미지 생성 오류 배너 */}
            {(() => {
              const errMatch = generatedImagePrompt?.match(/\[이미지 생성 오류: (.+?)\]$/s);
              if (!errMatch) return null;
              const [, errMsg] = errMatch;
              return (
                <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: "0.5rem", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.82rem", color: "#fca5a5" }}>
                  ⚠️ <strong>이미지 생성 오류:</strong> {errMsg}
                </div>
              );
            })()}

            <div className="instagram-mockup" style={{ marginBottom: "1.5rem" }}>
              <div className="insta-header">
                <div className="insta-avatar">So</div>
                <div className="insta-username">somabi_marketing</div>
              </div>

              <div className="insta-image-wrapper">
                {generatedImageUrl ? (
                  <img
                    src={generatedImageUrl}
                    alt="Generated Promo"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                    <div className="spinner" style={{ borderColor: "rgba(255,255,255,0.1)", borderTopColor: "var(--color-primary)" }} />
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>이미지를 생성하는 중...</p>
                  </div>
                )}
              </div>

              <div className="insta-actions">
                <span className="insta-icon">❤️</span>
                <span className="insta-icon">💬</span>
                <span className="insta-icon">✈️</span>
              </div>

              <div className="insta-caption-area" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.75rem" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>AI 이미지 생성 프롬프트:</p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontStyle: "italic", marginBottom: "0.75rem" }}>
                  {(generatedImagePrompt || "").split("\n\n[이미지 생성")[0]}
                </p>
                <div className="insta-caption-text">
                  <span className="insta-username" style={{ marginRight: "0.5rem" }}>somabi_marketing</span>
                  {generatedPost}
                </div>
              </div>
            </div>

            {/* 피드백 입력 폼 */}
            <div className="form-group">
              <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>이미지 수정 의견 전달 (반려 시 필수)</span>
              </label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="form-textarea"
                placeholder="예: 딸기 크림 타르트 단면을 잘라 놓은 클로즈업 사진으로 이미지를 재생성해 줘."
                disabled={loading}
              />
            </div>

            {upgradeBanner}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1.5rem" }}>
              <button
                type="button"
                onClick={() => handleFeedback("reject")}
                className={`btn btn-reject ${loading ? "btn-disabled" : ""}`}
                disabled={loading}
              >
                {loading ? <div className="spinner" /> : "이미지 재생성 (반려)"}
              </button>
              <button
                type="button"
                onClick={() => handleFeedback("approve")}
                className={`btn btn-primary ${loading ? "btn-disabled" : ""}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner" /> 영상 편집자 대기 중...
                  </>
                ) : (
                  "이미지 확정 및 쇼츠 단계 이동"
                )}
              </button>
            </div>
          </div>
        )}

        {/* [4단계] 쇼츠 영상 검토 */}
        {currentStage === "video" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
              <div>
                <h2 className="gradient-text" style={{ fontSize: "1.25rem", marginBottom: "0.35rem" }}>
                  🎬 [3단계] 쇼츠 영상 검토
                </h2>
                <ModelBadge type="video" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0, marginTop: "0.15rem" }}>
                <SaveButton />
                <span className="subheading" style={{ fontSize: "0.75rem", background: "rgba(6, 182, 212, 0.15)", color: "var(--color-accent)", padding: "0.25rem 0.5rem", borderRadius: "0.25rem", fontWeight: 700 }}>
                  🤖 영상 편집자 에이전트
                </span>
              </div>
            </div>
            <p className="subheading" style={{ marginBottom: "1.5rem" }}>
              마케팅용 15초 쇼츠 비디오 스크립트와 영상 프리뷰를 검토해 보세요.
            </p>

            {/* 비디오 및 대본 영역 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
              {/* 비디오 플레이어 */}
              <div
                className="glass-card"
                style={{
                  padding: 0,
                  overflow: "hidden",
                  background: "#000",
                  aspectRatio: "9 / 16",
                  maxWidth: "280px",
                  margin: "0 auto",
                  position: "relative",
                  border: "1px solid var(--border-color)"
                }}
              >
                {/* 실제 영상 (Pollinations.ai) — 로드 실패 시 이미지 폴백 */}
                {generatedVideoUrl && !videoError && !generatedVideoUrl.startsWith("data:") && (
                  generatedVideoUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? null : (
                    <video
                      key={generatedVideoUrl}
                      src={generatedVideoUrl}
                      controls
                      autoPlay
                      loop
                      muted
                      playsInline
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      onError={() => setVideoError(true)}
                    />
                  )
                )}

                {/* 폴백: 홍보 이미지 + Ken Burns 애니메이션 */}
                {(videoError || !generatedVideoUrl || generatedVideoUrl.startsWith("data:") || generatedVideoUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i)) && (
                  <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}>
                    {generatedImageUrl ? (
                      <img
                        src={generatedImageUrl}
                        alt="영상 프리뷰"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          animation: "kenBurns 12s ease-in-out infinite",
                          transformOrigin: "center center",
                        }}
                      />
                    ) : (
                      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                        <div className="spinner" />
                        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>영상 준비 중...</p>
                      </div>
                    )}
                    {/* 이미지 폴백 안내 */}
                    <div style={{ position: "absolute", top: "0.5rem", left: "0.5rem", right: "0.5rem", zIndex: 10 }}>
                      <span style={{ fontSize: "0.6rem", background: "rgba(0,0,0,0.65)", color: "#aaa", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                        📸 이미지 기반 프리뷰 (AI 영상 생성 준비 중)
                      </span>
                    </div>
                  </div>
                )}

                {/* 하단 SNS 오버레이 */}
                <div style={{ position: "absolute", bottom: "1rem", left: "1rem", right: "1rem", pointerEvents: "none", zIndex: 10, background: "rgba(0,0,0,0.45)", padding: "0.5rem", borderRadius: "0.5rem", backdropFilter: "blur(4px)" }}>
                  <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "white" }}>@somabi_marketing</p>
                  <p style={{ fontSize: "0.7rem", color: "#ddd", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{generatedPost?.split("\n")[0]}</p>
                </div>
              </div>

              {/* 영상 생성 안내 */}
              <div className="glass-card" style={{ background: "rgba(6,182,212,0.06)", borderColor: "rgba(6,182,212,0.2)", padding: "0.85rem 1rem" }}>
                <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-accent)", marginBottom: "0.3rem" }}>🎬 영상 생성 안내</p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  현재 무료 AI 영상(Pollinations.ai)을 시도합니다. 로딩에 30초~2분 소요될 수 있습니다.
                  영상이 표시되지 않을 경우 아래 대본을 CapCut, Canva, 클립챔피언 등에서 활용하세요.
                </p>
              </div>

              {/* 대본 표시 */}
              <div className="glass-card" style={{ background: "rgba(0,0,0,0.3)" }}>
                <p style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--color-accent)" }}>🎞️ 비디오 자막 및 대본 흐름</p>
                <div style={{ fontSize: "0.85rem", whiteSpace: "pre-wrap", lineHeight: 1.5, color: "var(--text-primary)" }}>
                  {generatedVideoScript}
                </div>
              </div>
            </div>

            {/* 피드백 입력 폼 */}
            <div className="form-group">
              <label className="form-label">영상 대본/자막 수정 의견 (반려 시 필수)</label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="form-textarea"
                placeholder="예: 0~5초의 자막을 '지금까지 먹은 케이크는 잊어라!'로 자막 문구를 교체해 주고, 마지막 성우 TTS 톤을 밝게 바꾼 걸로 수정해 줘."
                disabled={loading}
              />
            </div>

            {upgradeBanner}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1.5rem" }}>
              <button
                type="button"
                onClick={() => handleFeedback("reject")}
                className={`btn btn-reject ${loading ? "btn-disabled" : ""}`}
                disabled={loading}
              >
                {loading ? <div className="spinner" /> : "영상 대본 수정 (반려)"}
              </button>
              <button
                type="button"
                onClick={() => handleFeedback("approve")}
                className={`btn btn-primary ${loading ? "btn-disabled" : ""}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner" /> 배포 에이전트 준비 중...
                  </>
                ) : (
                  "영상 승인 및 배포 단계 이동"
                )}
              </button>
            </div>
          </div>
        )}

        {/* [5단계] 최종 배포 채널 선택 */}
        {currentStage === "publish" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <h2 className="gradient-text" style={{ fontSize: "1.25rem" }}>
                🚀 [4단계] 최종 배포 채널 설정
              </h2>
              <span className="subheading" style={{ fontSize: "0.75rem", background: "rgba(16, 185, 129, 0.15)", color: "var(--color-success)", padding: "0.25rem 0.5rem", borderRadius: "0.25rem", fontWeight: 700 }}>
                🤖 배포 에이전트 대기
              </span>
            </div>
            <p className="subheading" style={{ marginBottom: "1.5rem" }}>
              제작이 승인된 콘텐츠 팩입니다. 배포를 진행할 마케팅 채널을 선택한 후 배포 명령을 내려 주세요.
            </p>

            {/* 채널 선택 체크박스 */}
            <div className="glass-card" style={{ background: "rgba(255,255,255,0.02)", marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>📢 배포 채널 지정</h3>
              
              <label className="publish-card" style={{ cursor: "pointer", border: publishChannels.includes("instagram") ? "1px solid var(--color-primary)" : "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div className="publish-card-logo instagram-logo">📸</div>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontSize: "0.875rem", fontWeight: 700 }}>인스타그램 피드 & 릴스 배포</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>확정된 이미지와 15초 쇼츠 비디오 등록</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={publishChannels.includes("instagram")}
                  onChange={() => handleChannelChange("instagram")}
                  style={{ width: "1.25rem", height: "1.25rem", cursor: "pointer", accentColor: "var(--color-primary)" }}
                  disabled={loading}
                />
              </label>

              <label className="publish-card" style={{ cursor: "pointer", border: publishChannels.includes("kakaotalk") ? "1px solid var(--color-primary)" : "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div className="publish-card-logo kakaotalk-logo">💬</div>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontSize: "0.875rem", fontWeight: 700 }}>카카오 비즈니스 채널 발송</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>가입 회원 및 친구 톡 대상 메시지 전송</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={publishChannels.includes("kakaotalk")}
                  onChange={() => handleChannelChange("kakaotalk")}
                  style={{ width: "1.25rem", height: "1.25rem", cursor: "pointer", accentColor: "var(--color-primary)" }}
                  disabled={loading}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handlePublish}
              className={`btn btn-primary ${loading || publishChannels.length === 0 ? "btn-disabled" : ""}`}
              disabled={loading || publishChannels.length === 0}
            >
              {loading ? (
                <>
                  <div className="spinner" /> 🤖 배포 에이전트가 배포 처리 중...
                </>
              ) : (
                "배포 에이전트에 최종 배포 실행 요청"
              )}
            </button>
          </div>
        )}

        {/* [6단계] 최종 배포 완료 화면 */}
        {currentStage === "done" && (
          <div className="text-center">
            <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>🎉</div>
            <h2 className="gradient-text" style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
              최종 배포 프로세스 완료!
            </h2>
            <p className="subheading" style={{ marginBottom: "2rem" }}>
              배포 에이전트가 지정된 채널에 콘텐츠 전송 및 등록 처리를 성공적으로 마쳤습니다.
            </p>

            {/* 채널별 배포 결과 출력 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
              {publishResults.instagram && (
                <div className="publish-card" style={{ borderColor: "rgba(16, 185, 129, 0.4)", background: "rgba(16, 185, 129, 0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div className="publish-card-logo instagram-logo">📸</div>
                    <div style={{ textAlign: "left" }}>
                      <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-success)" }}>인스타그램 피드 배포 성공!</p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{publishResults.instagram}</p>
                    </div>
                  </div>
                  <a
                    href={publishResults.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                    style={{ width: "auto", fontSize: "0.8rem", padding: "0.5rem 0.75rem" }}
                  >
                    링크로 이동
                  </a>
                </div>
              )}

              {publishResults.kakaotalk && (
                <div className="publish-card" style={{ borderColor: "rgba(16, 185, 129, 0.4)", background: "rgba(16, 185, 129, 0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div className="publish-card-logo kakaotalk-logo">💬</div>
                    <div style={{ textAlign: "left" }}>
                      <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-success)" }}>카카오톡 비즈니스 메시지 전송 성공!</p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{publishResults.kakaotalk}</p>
                    </div>
                  </div>
                  <span
                    style={{ fontSize: "0.8rem", color: "var(--color-success)", fontWeight: 700, paddingRight: "0.5rem" }}
                  >
                    발송 완료 ✓
                  </span>
                </div>
              )}
            </div>

            {/* 최종 결과물 요약 */}
            <div className="glass-card" style={{ textAlign: "left", background: "rgba(255,255,255,0.02)", marginBottom: "2rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", color: "var(--color-primary)" }}>
                📦 마케팅 콘텐츠 요약본
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <h4 style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>홍보글</h4>
                  <p style={{ fontSize: "0.875rem", whiteSpace: "pre-wrap", background: "rgba(0,0,0,0.2)", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid var(--border-color)" }}>
                    {generatedPost}
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <h4 style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>홍보 이미지</h4>
                    <div style={{ borderRadius: "0.5rem", overflow: "hidden", border: "1px solid var(--border-color)", aspectRatio: "1/1", position: "relative" }}>
                      {generatedImageUrl && (
                        <img src={generatedImageUrl} alt="Approved Promo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>쇼츠 영상</h4>
                    <div style={{ borderRadius: "0.5rem", overflow: "hidden", border: "1px solid var(--border-color)", aspectRatio: "1/1", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {generatedVideoUrl && (
                        <video src={generatedVideoUrl} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button onClick={handleReset} className="btn btn-secondary">
              새로운 캠페인 시작 (처음으로)
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
