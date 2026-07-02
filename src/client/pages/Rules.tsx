import { Link } from '../lib/router';

// 駒の動きの図: 5x5グリッド。'●' = 1マス移動 / 矢印 = その方向へ何マスでも
type Diagram = { char: string; name: string; cells: [number, number, string][]; note?: string };

const DIAGRAMS: Diagram[] = [
  { char: '歩', name: '歩兵', cells: [[1, 2, '●']], note: '成ると「と金」(金と同じ動き)' },
  { char: '香', name: '香車', cells: [[0, 2, '↑']], note: 'まっすぐ何マスでも。成ると金と同じ' },
  {
    char: '桂',
    name: '桂馬',
    cells: [
      [0, 1, '●'],
      [0, 3, '●'],
    ],
    note: '駒を飛び越えられる。成ると金と同じ',
  },
  {
    char: '銀',
    name: '銀将',
    cells: [
      [1, 1, '●'],
      [1, 2, '●'],
      [1, 3, '●'],
      [3, 1, '●'],
      [3, 3, '●'],
    ],
    note: '成ると金と同じ',
  },
  {
    char: '金',
    name: '金将',
    cells: [
      [1, 1, '●'],
      [1, 2, '●'],
      [1, 3, '●'],
      [2, 1, '●'],
      [2, 3, '●'],
      [3, 2, '●'],
    ],
  },
  {
    char: '角',
    name: '角行',
    cells: [
      [1, 1, '↖'],
      [1, 3, '↗'],
      [3, 1, '↙'],
      [3, 3, '↘'],
    ],
    note: '斜めに何マスでも。成ると「馬」(＋上下左右1マス)',
  },
  {
    char: '飛',
    name: '飛車',
    cells: [
      [0, 2, '↑'],
      [2, 0, '←'],
      [2, 4, '→'],
      [4, 2, '↓'],
    ],
    note: '縦横に何マスでも。成ると「龍」(＋斜め1マス)',
  },
  {
    char: '王',
    name: '王将・玉将',
    cells: [
      [1, 1, '●'],
      [1, 2, '●'],
      [1, 3, '●'],
      [2, 1, '●'],
      [2, 3, '●'],
      [3, 1, '●'],
      [3, 2, '●'],
      [3, 3, '●'],
    ],
    note: 'この駒を詰まされたら負け',
  },
];

function PieceDiagram({ d }: { d: Diagram }) {
  return (
    <div className="diagram">
      <div className="diagram-grid">
        {Array.from({ length: 25 }, (_, i) => {
          const row = Math.floor(i / 5);
          const col = i % 5;
          if (row === 2 && col === 2) {
            return (
              <span key={i} className="diagram-cell is-piece">
                <span className="piece">{d.char}</span>
              </span>
            );
          }
          const mark = d.cells.find(([r, c]) => r === row && c === col)?.[2];
          return (
            <span key={i} className={`diagram-cell ${mark ? 'is-move' : ''}`}>
              {mark ?? ''}
            </span>
          );
        })}
      </div>
      <div className="diagram-caption">
        <strong>{d.name}</strong>
        {d.note && <small>{d.note}</small>}
      </div>
    </div>
  );
}

export function Rules() {
  return (
    <div className="kifu-page rules-page">
      <h1 className="page-title">📖 遊び方</h1>
      <p className="page-sub">将棋のルールと、このサイトの操作方法</p>

      <section className="rules-section">
        <h2>将棋とは</h2>
        <p>
          2人で交互に駒を動かし、相手の<strong>王将(玉将)を詰ませたら勝ち</strong>のゲームです。
          相手の駒がいるマスに動かすとその駒を取れて、取った駒は<strong>自分の駒として好きなマスに打てます</strong>(将棋ならではのルール!)。
        </p>
      </section>

      <section className="rules-section">
        <h2>駒の動き</h2>
        <p>●は1マス、矢印はその方向へ何マスでも進めます(相手側が上)。</p>
        <div className="diagram-grid-list">
          {DIAGRAMS.map((d) => (
            <PieceDiagram key={d.char} d={d} />
          ))}
        </div>
      </section>

      <section className="rules-section">
        <h2>成り（プロモーション）</h2>
        <ul>
          <li>相手陣（奥の3段）に入る・出る・中で動くと、駒を裏返して強化（成り）できます</li>
          <li>金と王は成れません。歩・香・桂・銀は成ると金と同じ動きになります</li>
          <li>角は「馬」、飛車は「龍」になってさらに強力に</li>
          <li>行き所がなくなるマスへ進むときは必ず成ります（例: 1段目の歩）</li>
        </ul>
      </section>

      <section className="rules-section">
        <h2>持ち駒と禁じ手</h2>
        <ul>
          <li>取った駒は自分の番に空きマスへ「打つ」ことができます（成った駒は元に戻る）</li>
          <li><strong>二歩</strong>: 同じ筋に自分の歩を2枚置くのは反則</li>
          <li><strong>打ち歩詰め</strong>: 歩を打って即詰みにするのは反則</li>
          <li>王手を放置する手・自分から王手に飛び込む手は指せません</li>
          <li>このサイトでは反則になる手はそもそも選べないので、安心して指せます</li>
        </ul>
      </section>

      <section className="rules-section">
        <h2>勝敗の決まり方</h2>
        <ul>
          <li><strong>詰み</strong>: 相手の王がどう逃げても取られる状態にしたら勝ち</li>
          <li><strong>投了</strong>: 「負けました」と認める。いつでも可能</li>
          <li><strong>時間切れ</strong>: 持ち時間ありの対局では、時間を使い切ると負け</li>
          <li><strong>千日手</strong>: 同じ局面が4回現れたら引き分け（ただし王手を続けていた側は負け）</li>
        </ul>
      </section>

      <section className="rules-section">
        <h2>このサイトの操作方法</h2>
        <ul>
          <li><strong>駒を動かす</strong>: 自分の駒をタップ → 移動できるマスが光る → 行き先をタップ</li>
          <li><strong>持ち駒を打つ</strong>: 盤の下の持ち駒をタップ → 打てるマスをタップ</li>
          <li><strong>友だちと対局</strong>: ホームで部屋を作り、URLを相手に送るだけ。持ち時間も選べます</li>
          <li><strong>待った</strong>: 対人戦では相手が承認すると1手戻せます。CPU戦では自由に戻せます</li>
          <li><strong>棋譜</strong>: 対局が終わると自動でブラウザに保存。棋譜庫で再生やKIFダウンロードができます</li>
        </ul>
      </section>

      <div className="action-row rules-actions">
        <Link to="/practice" className="btn btn-primary">
          🎓 練習盤で試してみる
        </Link>
        <Link to="/" className="btn btn-ghost">
          ホームへ
        </Link>
      </div>
    </div>
  );
}
