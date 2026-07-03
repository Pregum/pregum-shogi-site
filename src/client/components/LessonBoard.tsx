import { useEffect, useState } from 'react';
import { SENTE } from '../../shared/shogi';
import type { Lesson } from '../lib/lessons';
import { Board } from './Board';

// レッスンをコマ送り再生するミニ盤(自動再生+手動操作)
export function LessonBoard({ lesson }: { lesson: Lesson }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const len = lesson.steps.length;

  useEffect(() => {
    if (!playing) return;
    // 最終ステップは長めに見せてからループ
    const duration = index === len - 1 ? 3600 : 2400;
    const t = setTimeout(() => setIndex((i) => (i + 1) % len), duration);
    return () => clearTimeout(t);
  }, [playing, index, len]);

  const step = lesson.steps[index];

  const goto = (i: number) => {
    setPlaying(false);
    setIndex(Math.max(0, Math.min(len - 1, i)));
  };

  return (
    <div className="lesson-board">
      <Board pos={step.pos} viewpoint={SENTE} interactive={false} lastTo={step.lastTo ?? null} />
      <p className="lesson-caption">{step.caption}</p>
      <div className="lesson-controls">
        <button className="btn btn-sm btn-ghost" onClick={() => goto(index - 1)} disabled={index === 0}>
          ◀
        </button>
        <button className="btn btn-sm btn-ghost lesson-play" onClick={() => setPlaying(!playing)}>
          {playing ? '⏸ 一時停止' : '▶ 再生'}
        </button>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => goto(index + 1)}
          disabled={index === len - 1}
        >
          ▶
        </button>
        <span className="lesson-counter">
          {index + 1} / {len}
        </span>
      </div>
    </div>
  );
}
