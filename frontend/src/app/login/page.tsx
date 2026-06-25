"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "로그인에 실패했습니다.");
        return;
      }
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("email", data.email);
      router.push("/");
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
          소마비 SoMaBi
        </h1>
        <p className="subheading" style={{ textAlign: "center", marginBottom: "2rem" }}>
          소상공인 SNS 마케팅 자동화 비서
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
            <label className="form-label">비밀번호</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p style={{ color: "var(--color-error)", fontSize: "0.875rem", marginBottom: "1rem" }}>
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "0.5rem" }} disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="subheading" style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem" }}>
          계정이 없으신가요?{" "}
          <Link href="/signup" style={{ color: "var(--color-primary)", textDecoration: "underline" }}>
            회원가입
          </Link>
        </p>
      </div>
    </main>
  );
}
