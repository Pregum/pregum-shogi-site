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
    key: '居飛車' as const,
    heading: '🏹 居飛車の戦法',
    desc: '飛車を最初の位置(2筋)のまま使う王道スタイル。まっすぐ攻める分かりやすさが魅力。',
  },
  {
    key: '振り飛車' as const,
    heading: '🌀 振り飛車の戦法',
    desc: '飛車を左へ「振って」戦うスタイル。美濃囲いとの相性が抜群で、堅く構えてカウンターを狙います。',
  },
  {
    key: '囲い' as const,
    heading: '🏯 囲い',
    desc: '玉を守る陣形。対局中に完成させると完成エフェクトが出ます。',
  },
  {
    key: '囲い崩し' as const,
    heading: '💥 囲いの崩し方',
    desc: 'どんなに堅い囲いにも必ず急所がある。美濃・矢倉の弱点を突く「攻めの設計図」。',
  },
  {
    key: '詰みの形' as const,
    heading: '👑 詰みの形',
    desc: '終盤の目的地。基本の詰み形を知っていれば、ゴールから逆算して寄せられます。',
  },
];

export function Study() {
  return (
    <div className="kifu-page study-page">
      <h1 className="page-title">📚 手筋・戦法・囲いを学ぶ</h1>
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
