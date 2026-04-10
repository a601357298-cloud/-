import { useEffect, useState } from "react";
import type { Question } from "../types";

interface StudyDeckProps {
  categoryName: string;
  questions: Question[];
  initialOrder: string[];
  isAuthenticated?: boolean;
  favoritePending?: boolean;
  onToggleFavorite?: (questionId: string) => Promise<void> | void;
  onRequireLogin?: () => void;
}

function buildOrderedQuestions(questions: Question[], initialOrder: string[]) {
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const ordered = initialOrder
    .map((id) => questionMap.get(id))
    .filter((question): question is Question => Boolean(question));

  const missing = questions.filter((question) => !initialOrder.includes(question.id));
  return [...ordered, ...missing];
}

export function StudyDeck({
  categoryName,
  questions,
  initialOrder,
  isAuthenticated = false,
  favoritePending = false,
  onToggleFavorite,
  onRequireLogin
}: StudyDeckProps) {
  const orderedQuestions = buildOrderedQuestions(questions, initialOrder);
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    setIndex(0);
    setIsFlipped(false);
  }, [categoryName, initialOrder.join("|"), questions.length]);

  if (orderedQuestions.length === 0) {
    return (
      <section className="card-shell">
        <div className="question-card empty-card">
          <strong>这个分类还没有题目，先去右上角上传第一题吧。</strong>
        </div>
      </section>
    );
  }

  const current = orderedQuestions[index] ?? orderedQuestions[0];

  function moveTo(nextIndex: number) {
    const safeIndex = (nextIndex + orderedQuestions.length) % orderedQuestions.length;
    setIndex(safeIndex);
    setIsFlipped(false);
  }

  function onTouchStart(event: React.TouchEvent<HTMLButtonElement>) {
    setTouchStartX(event.touches[0]?.clientX ?? null);
  }

  function onTouchEnd(event: React.TouchEvent<HTMLButtonElement>) {
    if (touchStartX === null) {
      return;
    }

    const deltaX = (event.changedTouches[0]?.clientX ?? 0) - touchStartX;
    if (deltaX > 40) {
      moveTo(index - 1);
    } else if (deltaX < -40) {
      moveTo(index + 1);
    }
    setTouchStartX(null);
  }

  return (
    <section className="card-shell">
      <header className="study-meta">
        <div>
          <span className="eyebrow">当前分类</span>
          <h2>{categoryName}</h2>
        </div>
        <p>
          随机题卡 {index + 1} / {orderedQuestions.length}
        </p>
      </header>

      <button
        type="button"
        className={`question-card ${isFlipped ? "question-card--flipped" : ""}`}
        onClick={() => setIsFlipped((value) => !value)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        aria-label={isFlipped ? "返回题目" : "点击翻面"}
      >
        <div className="question-card__content">
          <span className="question-card__label">{isFlipped ? "答案" : "题目"}</span>
          <strong>{isFlipped ? current.answer : current.question}</strong>
        </div>
      </button>

      <div className="study-footer">
        <span>创建人：{current.authorName}</span>
        <span>{isFlipped ? "再点一次回到题目" : "点击卡片查看答案"}</span>
      </div>

      <div className="study-actions">
        <button type="button" className="ghost-button" onClick={() => moveTo(index - 1)}>
          上一题
        </button>
        <button
          type="button"
          className={current.isFavorite ? "nav-button nav-button--active" : "nav-button"}
          onClick={() => {
            if (!isAuthenticated) {
              onRequireLogin?.();
              return;
            }

            void onToggleFavorite?.(current.id);
          }}
          disabled={favoritePending}
        >
          {current.isFavorite ? "已收藏" : "收藏"}
        </button>
        <button type="button" className="primary-button" onClick={() => moveTo(index + 1)}>
          下一题
        </button>
      </div>
    </section>
  );
}
