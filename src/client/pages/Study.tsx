import { useState } from 'react';
import { LessonBoard } from '../components/LessonBoard';
import { LESSONS, type LessonCategory } from '../lib/lessons';
import { Link } from '../lib/router';

const CATEGORIES: { key: LessonCategory; icon: string; label: string; desc: string }[] = [
  {
    key: '手筋',
    icon: '⚔️',
    label: '手筋',
    desc: '駒の特性を活かした「うまい手」の型。覚えるだけで実戦の勝率が上がります。',
  },
  {
    key: '居飛車',
    icon: '🏹',
    label: '居飛車の戦法',
    desc: '飛車を最初の位置(2筋)のまま使う王道スタイル。まっすぐ攻める分かりやすさが魅力。',
  },
  {
    key: '振り飛車',
    icon: '🌀',
    label: '振り飛車の戦法',
    desc: '飛車を左へ「振って」戦うスタイル。美濃囲いとの相性が抜群で、堅く構えてカウンターを狙います。',
  },
  {
    key: '囲い',
    icon: '🏯',
    label: '囲い',
    desc: '玉を守る陣形。対局中に完成させると完成エフェクトが出ます。',
  },
  {
    key: '囲い崩し',
    icon: '💥',
    label: '囲いの崩し方',
    desc: 'どんなに堅い囲いにも必ず急所がある。美濃・矢倉・穴熊の弱点を突く「攻めの設計図」。',
  },
  {
    key: '詰みの形',
    icon: '👑',
    label: '詰みの形',
    desc: '終盤の目的地。基本の詰み形と必至を知っていれば、ゴールから逆算して寄せられます。',
  },
];

export function Study() {
  const [active, setActive] = useState<LessonCategory>('手筋');
  const category = CATEGORIES.find((c) => c.key === active)!;
  const lessons = LESSONS.filter((l) => l.category === active);

  return (
    <div className="kifu-page study-page">
      <h1 className="page-title">📚 将棋教室</h1>
      <p className="page-sub">盤面のアニメーションで覚える、将棋の頻出ワザ集（全{LESSONS.length}レッスン）</p>

      <nav className="study-tabs" aria-label="カテゴリ">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            className={`study-tab ${c.key === active ? 'is-active' : ''}`}
            onClick={() => setActive(c.key)}
          >
            <span className="study-tab-icon">{c.icon}</span>
            <span>{c.label}</span>
            <span className="study-tab-count">{LESSONS.filter((l) => l.category === c.key).length}</span>
          </button>
        ))}
      </nav>

      <p className="study-desc">{category.desc}</p>

      <div className="lesson-grid" key={active}>
        {lessons.map((lesson) => (
          <article key={lesson.id} className="lesson-card">
            <h3 className="lesson-title">{lesson.title}</h3>
            <p className="lesson-summary">{lesson.summary}</p>
            <LessonBoard lesson={lesson} />
          </article>
        ))}
      </div>

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
