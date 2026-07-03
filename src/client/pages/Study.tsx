import { LessonBoard } from '../components/LessonBoard';
import { LESSONS } from '../lib/lessons';
import { Link } from '../lib/router';

const CATEGORIES = [
  {
    key: '手筋' as const,
    heading: '⚔️ 手筋（てすじ）',
    desc: '駒の特性を活かした「うまい手」の型。覚えるだけで実戦の勝率が上がります。',
  },
  {
    key: '囲い' as const,
    heading: '🏯 囲い',
    desc: '玉を守る陣形。対局中に完成させると完成エフェクトが出ます。',
  },
];

export function Study() {
  return (
    <div className="kifu-page study-page">
      <h1 className="page-title">📚 手筋と囲いを学ぶ</h1>
      <p className="page-sub">盤面のアニメーションで覚える、将棋の頻出ワザ集</p>

      {CATEGORIES.map((cat) => (
        <section key={cat.key} className="study-section">
          <h2 className="study-heading">{cat.heading}</h2>
          <p className="study-desc">{cat.desc}</p>
          <div className="lesson-grid">
            {LESSONS.filter((l) => l.category === cat.key).map((lesson) => (
              <article key={lesson.id} className="lesson-card">
                <h3 className="lesson-title">{lesson.title}</h3>
                <p className="lesson-summary">{lesson.summary}</p>
                <LessonBoard lesson={lesson} />
              </article>
            ))}
          </div>
        </section>
      ))}

      <div className="action-row rules-actions">
        <Link to="/practice" className="btn btn-primary">
          🎓 練習盤で試してみる
        </Link>
        <Link to="/rules" className="btn btn-ghost">
          📖 基本ルールを見る
        </Link>
        <Link to="/" className="btn btn-ghost">
          ホームへ
        </Link>
      </div>
    </div>
  );
}
