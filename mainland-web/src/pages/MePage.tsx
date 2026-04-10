import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Question } from "../types";

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

interface QuestionListSectionProps {
  title: string;
  emptyText: string;
  questions: Question[];
  defaultExpanded?: boolean;
  onRemoveFavorite?: (questionId: string) => Promise<void> | void;
}

function QuestionListSection({
  title,
  emptyText,
  questions,
  defaultExpanded = false,
  onRemoveFavorite
}: QuestionListSectionProps) {
  const [sectionExpanded, setSectionExpanded] = useState(defaultExpanded);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  function toggleExpanded(questionId: string) {
    setExpandedIds((current) =>
      current.includes(questionId)
        ? current.filter((item) => item !== questionId)
        : [...current, questionId]
    );
  }

  return (
    <section className="personal-section form-card form-card--wide">
      <button
        type="button"
        className="personal-section__toggle"
        onClick={() => setSectionExpanded((current) => !current)}
        aria-expanded={sectionExpanded}
        aria-label={`${sectionExpanded ? "收起" : "展开"}${title}`}
      >
        <div>
          <p className="eyebrow">个人中心</p>
          <h2>{title}</h2>
        </div>
        <div className="personal-section__toggle-meta">
          <span className="status-pill">{questions.length} 题</span>
          <span className="personal-section__chevron" aria-hidden="true">
            {sectionExpanded ? "收起" : "展开"}
          </span>
        </div>
      </button>

      {!sectionExpanded ? null : questions.length === 0 ? <div className="state-panel">{emptyText}</div> : null}

      {sectionExpanded && questions.length > 0 ? (
        <div className="personal-question-list">
          {questions.map((question) => {
            const expanded = expandedIds.includes(question.id);
            return (
              <article key={question.id} className="personal-question-card">
                <div className="personal-question-card__meta">
                  <span>{question.category}</span>
                  <span>{formatDate(question.createdAt)}</span>
                </div>

                <strong>{question.question}</strong>

                <div className="personal-question-card__meta">
                  <span>创建人：{question.authorName}</span>
                  {question.isFavorite ? <span>已收藏</span> : null}
                </div>

                {expanded ? (
                  <div className="personal-question-card__answer">
                    <span className="question-card__label">答案</span>
                    <p>{question.answer}</p>
                  </div>
                ) : null}

                <div className="inline-actions">
                  <button
                    type="button"
                    className={expanded ? "nav-button nav-button--active" : "nav-button"}
                    onClick={() => toggleExpanded(question.id)}
                  >
                    {expanded ? "收起答案" : "查看答案"}
                  </button>

                  {onRemoveFavorite ? (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => void onRemoveFavorite(question.id)}
                    >
                      取消收藏
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export function MePage() {
  const [uploadedQuestions, setUploadedQuestions] = useState<Question[]>([]);
  const [favoriteQuestions, setFavoriteQuestions] = useState<Question[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      setError("");

      try {
        const [myQuestionsResponse, myFavoritesResponse] = await Promise.all([
          api.myQuestions(),
          api.myFavorites()
        ]);

        if (cancelled) {
          return;
        }

        setUploadedQuestions(myQuestionsResponse.questions);
        setFavoriteQuestions(myFavoritesResponse.questions);
        setStatus("ready");
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setStatus("error");
        setError(loadError instanceof Error ? loadError.message : "加载失败");
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRemoveFavorite(questionId: string) {
    await api.removeFavorite(questionId);
    setFavoriteQuestions((current) => current.filter((item) => item.id !== questionId));
  }

  if (status === "loading") {
    return <div className="state-panel">正在加载个人中心...</div>;
  }

  if (status === "error") {
    return <div className="state-panel state-panel--error">{error}</div>;
  }

  return (
    <div className="page-content">
      <QuestionListSection
        title="我上传的题目"
        emptyText="你还没有上传题目。"
        questions={uploadedQuestions}
      />
      <QuestionListSection
        title="我收藏的题目"
        emptyText="你还没有收藏题目。"
        questions={favoriteQuestions}
        onRemoveFavorite={handleRemoveFavorite}
      />
    </div>
  );
}
