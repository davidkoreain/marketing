"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "회원가입에 실패했습니다.");
        return;
      }
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("email", data.email);
      router.push("/settings");
    } catch {
      setError("서버 연결에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-container" style={{ justifyContent: "center", minHeight: "100vh" }}>
      <div className="glass-card" style={{ padding: "2rem" }}>
        <h1 className="gradient-text heading-lg" style={{ textAlign: "center", marginBottom: "0.5rem" }}>
          회원가입
        </h1>
        <p className="subheading" style={{ textAlign: "center", marginBottom: "2rem" }}>
          가입 후 API 키를 설정하면 AI 마케팅을 시작할 수 있습니다.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">이메일</label>
            <input
              type="email"
              className="form-input"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">비밀번호 (8자 이상)</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">비밀번호 확인</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p style={{ color: "var(--color-error)", fontSize: "0.875rem", marginBottom: "1rem" }}>
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "0.5rem" }} disabled={loading}>
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <p className="subheading" style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem" }}>
          이미 계정이 있으신가요?{" "}
          <Link href="/login" style={{ color: "var(--color-primary)", textDecoration: "underline" }}>
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}
