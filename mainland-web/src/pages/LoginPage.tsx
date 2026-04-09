import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/upload" replace />;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await login(username, password);
      const redirectTarget =
        typeof location.state === "object" && location.state && "from" in location.state
          ? String(location.state.from)
          : "/upload";
      navigate(redirectTarget, { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="form-page">
      <div className="form-card">
        <p className="eyebrow">网站账号登录</p>
        <h1>登录后上传题目</h1>
        <p className="form-hint">这里使用网站自己的账号密码，不需要 GitHub 登录。</p>

        <form className="stack-form" onSubmit={onSubmit}>
          <label>
            <span>用户名</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label>
            <span>密码</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <div className="inline-error">{error}</div> : null}
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "登录中..." : "登录"}
          </button>
        </form>
      </div>
    </section>
  );
}

