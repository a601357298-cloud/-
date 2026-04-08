import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import type { Category } from "../types";

export function UploadPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState("python");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [authorName, setAuthorName] = useState(user?.displayName ?? "");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void api.categories().then((response) => {
      setCategories(response.categories);
      const defaultCategory = response.categories.find((item) => item.isDefault)?.slug ?? "python";
      setCategory(defaultCategory);
    });
  }, []);

  useEffect(() => {
    setAuthorName(user?.displayName ?? "");
  }, [user?.displayName]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus("");
    setError("");

    try {
      await api.createQuestion({
        category,
        question,
        answer,
        authorName: user?.role === "admin" ? authorName : undefined
      });
      setQuestion("");
      setAnswer("");
      setStatus("题目已经写入仓库并立即发布。");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="form-page">
      <div className="form-card form-card--wide">
        <p className="eyebrow">上传题目</p>
        <h1>把新题目直接写进题库</h1>
        <p className="form-hint">
          提交后 Worker 会用你的站点权限写入 GitHub 仓库。普通用户的创建人固定为自己的站内昵称。
        </p>

        <form className="stack-form" onSubmit={onSubmit}>
          <label>
            <span>题目分类</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>题目</span>
            <textarea
              rows={5}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </label>

          <label>
            <span>答案</span>
            <textarea
              rows={6}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
            />
          </label>

          <label>
            <span>创建人</span>
            <input
              value={authorName}
              onChange={(event) => setAuthorName(event.target.value)}
              disabled={user?.role !== "admin"}
            />
          </label>

          {status ? <div className="inline-success">{status}</div> : null}
          {error ? <div className="inline-error">{error}</div> : null}

          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "提交中..." : "立即发布"}
          </button>
        </form>
      </div>
    </section>
  );
}

