import { startTransition, useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { StudyDeck } from "../components/StudyDeck";
import { api } from "../lib/api";
import { buildShuffledOrder } from "../lib/shuffle";
import type { Category, Question } from "../types";

export function StudyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { category = "python" } = useParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [favoritePendingId, setFavoritePendingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      setError("");

      try {
        const [categoriesResponse, questionsResponse] = await Promise.all([
          api.categories(),
          api.questions(category)
        ]);

        if (cancelled) {
          return;
        }

        setCategories(categoriesResponse.categories);
        setQuestions(questionsResponse.questions);
        setOrder(buildShuffledOrder(questionsResponse.questions.map((question) => question.id), category));
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
  }, [category]);

  const currentCategory =
    categories.find((item) => item.slug === category) ?? {
      slug: category,
      name: category,
      order: 0,
      isDefault: category === "python",
      count: questions.length
    };

  return (
    <div className="study-layout">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">答题记录网站</p>
          <h1>
            {currentCategory.name}
            <br />
            随机刷题
          </h1>
          <p className="hero-copy">
            首页默认进入 Python 分类。点击卡片翻面看答案，左右滑动或点击按钮切题，分类切换后会重新打乱题目顺序。
          </p>
        </div>

        <div className="hero-stats">
          <div className="stat-card">
            <strong>{currentCategory.count}</strong>
            <span>当前分类题量</span>
          </div>
          <div className="stat-card">
            <strong>{categories.length || 7}</strong>
            <span>固定分类</span>
          </div>
          <div className="stat-card">
            <strong>即时发布</strong>
            <span>题目保存后立刻可见</span>
          </div>
        </div>
      </section>

      <nav className="category-tabs" aria-label="题目分类">
        {categories.map((item) => (
          <NavLink
            key={item.slug}
            to={`/study/${item.slug}`}
            className={({ isActive }) => (isActive ? "category-tab category-tab--active" : "category-tab")}
            onClick={(event) => {
              event.preventDefault();
              startTransition(() => {
                navigate(`/study/${item.slug}`);
              });
            }}
          >
            {item.name}
          </NavLink>
        ))}
      </nav>

      {status === "loading" ? <div className="state-panel">正在加载题库...</div> : null}
      {status === "error" ? <div className="state-panel state-panel--error">{error}</div> : null}
      {status === "ready" ? (
        <StudyDeck
          categoryName={currentCategory.name}
          questions={questions}
          initialOrder={order}
          isAuthenticated={Boolean(user)}
          favoritePending={Boolean(favoritePendingId)}
          onRequireLogin={() => {
            navigate("/login", {
              state: { from: location.pathname },
              replace: false
            });
          }}
          onToggleFavorite={async (questionId) => {
            const target = questions.find((item) => item.id === questionId);
            if (!target) {
              return;
            }

            setFavoritePendingId(questionId);
            try {
              if (target.isFavorite) {
                await api.removeFavorite(questionId);
              } else {
                await api.addFavorite(questionId);
              }

              setQuestions((currentQuestions) =>
                currentQuestions.map((item) =>
                  item.id === questionId ? { ...item, isFavorite: !item.isFavorite } : item
                )
              );
            } finally {
              setFavoritePendingId(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}
