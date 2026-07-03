// 勉強画面のレッスンデータ(手筋・囲い)
// 手筋: 実際の合法手を applyMove で進めたコマ送り
// 囲い: 片側の駒だけを動かすキーフレーム(手番の概念なし)
import type { Base, Color, Move, PieceType, Position, Sq } from '../../shared/shogi';
import { GOTE, SENTE, applyMove, emptyHand, idx, initialPosition } from '../../shared/shogi';

export interface LessonStep {
  pos: Position;
  caption: string;
  lastTo?: Sq;
}

export type LessonCategory = '手筋' | '囲い' | '居飛車' | '振り飛車';

export interface Lesson {
  id: string;
  title: string;
  category: LessonCategory;
  summary: string;
  steps: LessonStep[];
}

// 少数の駒だけを置いた局面を作る
function bare(
  pieces: [number, number, PieceType, Color][],
  senteHand: Partial<Record<Base, number>> = {},
): Position {
  const board: Position['board'] = new Array(81).fill(null);
  for (const [file, rank, type, color] of pieces) {
    board[idx(file, rank)] = { type, color };
  }
  const hands: Position['hands'] = [emptyHand(), emptyHand()];
  Object.assign(hands[SENTE], senteHand);
  return { board, hands, turn: SENTE, ply: 0 };
}

// 手筋用: 合法手を順に適用してステップ列を作る
function seq(start: Position, intro: string, moves: { move: Move; caption: string }[]): LessonStep[] {
  const steps: LessonStep[] = [{ pos: start, caption: intro }];
  let pos = start;
  for (const { move, caption } of moves) {
    pos = applyMove(pos, move);
    steps.push({ pos, caption, lastTo: move.to });
  }
  return steps;
}

// 囲い用: 駒を1枚だけ移動したキーフレームを作る(手番は変えない)
function relocate(pos: Position, from: [number, number], to: [number, number]): Position {
  const board = pos.board.slice();
  board[idx(to[0], to[1])] = board[idx(from[0], from[1])];
  board[idx(from[0], from[1])] = null;
  return { ...pos, board };
}

function frames(
  start: Position,
  intro: string,
  moves: [from: [number, number], to: [number, number], caption: string][],
): LessonStep[] {
  const steps: LessonStep[] = [{ pos: start, caption: intro }];
  let pos = start;
  for (const [from, to, caption] of moves) {
    pos = relocate(pos, from, to);
    steps.push({ pos, caption, lastTo: { file: to[0], rank: to[1] } });
  }
  return steps;
}

const sq = (file: number, rank: number): Sq => ({ file, rank });
const mv = (ff: number, fr: number, tf: number, tr: number, promote = false): Move => ({
  from: sq(ff, fr),
  to: sq(tf, tr),
  promote,
});

// ---------- 手筋 ----------

const fundoshi: Lesson = {
  id: 'fundoshi-kei',
  title: 'ふんどしの桂',
  category: '手筋',
  summary: '桂馬1枚で2枚の駒を同時に攻める両取りの手筋。桂の利きの形が「ふんどし」に見えることから。',
  steps: seq(
    bare(
      [
        [3, 1, 'OU', GOTE],
        [5, 1, 'HI', GOTE],
        [9, 9, 'OU', SENTE],
      ],
      { KE: 1 },
    ),
    '後手の玉が3一、飛車が5一。1マス空けて並んだこの形、実は桂打ちの絶好の標的です。',
    [
      {
        move: { to: sq(4, 3), drop: 'KE' },
        caption: '▲4三桂打！ 玉に王手をかけながら、5一の飛車にも当たっています。これが「ふんどしの桂」。',
      },
      {
        move: mv(3, 1, 2, 2),
        caption: '王手なので後手は玉を逃げるしかありません。',
      },
      {
        move: mv(4, 3, 5, 1, true),
        caption: '▲5一桂成。まんまと飛車をいただきました。桂1枚が飛車に化ける大戦果です。',
      },
    ],
  ),
};

const wariuchi: Lesson = {
  id: 'wariuchi-gin',
  title: '割り打ちの銀',
  category: '手筋',
  summary: '1マス空けて並んだ金や飛車の「間」に銀を打ち込む両取り。銀の斜め利きを最大活用する手筋。',
  steps: seq(
    bare(
      [
        [2, 2, 'OU', GOTE],
        [4, 1, 'KI', GOTE],
        [6, 1, 'KI', GOTE],
        [9, 9, 'OU', SENTE],
      ],
      { GI: 1 },
    ),
    '後手陣に金が2枚(4一と6一)。1マス空けて並んでいるのがポイントです。',
    [
      {
        move: { to: sq(5, 2), drop: 'GI' },
        caption: '▲5二銀打！ 銀の斜め前の利きが4一と6一、両方の金に同時に当たります。これが「割り打ちの銀」。',
      },
      {
        move: mv(4, 1, 3, 1),
        caption: '片方の金は逃げられますが…',
      },
      {
        move: mv(5, 2, 6, 1, true),
        caption: '▲6一銀成。もう片方の金は助かりません。銀を打って金を取る、確実な駒得です。',
      },
    ],
  ),
};

const dengaku: Lesson = {
  id: 'dengaku-zashi',
  title: '田楽刺し',
  category: '手筋',
  summary: '縦に並んだ玉と大駒を香車で串刺しにする手筋。手前の駒は逃げると王手放置になるため動けない。',
  steps: seq(
    bare(
      [
        [5, 1, 'OU', GOTE],
        [5, 3, 'HI', GOTE],
        [9, 9, 'OU', SENTE],
      ],
      { KY: 1 },
    ),
    '後手の玉と飛車が同じ5筋に縦に並んでいます。香車の出番です。',
    [
      {
        move: { to: sq(5, 5), drop: 'KY' },
        caption:
          '▲5五香打！ 飛車に当たっていますが、飛車が横に逃げると背後の玉が香の利きに入ってしまう(王手放置=反則)ため、飛車は動けません。串刺し＝「田楽刺し」です。',
      },
      {
        move: mv(5, 1, 4, 2),
        caption: '後手は玉をずらして飛車の逃げ道を作ろうとしますが…',
      },
      {
        move: mv(5, 5, 5, 3, true),
        caption: '▲5三香成、一足先に飛車をいただきます。△同玉と取り返されても、香と飛車の交換なら大成功です。',
      },
    ],
  ),
};

const atamakin: Lesson = {
  id: 'atama-kin',
  title: '頭金（あたまきん）',
  category: '手筋',
  summary: 'すべての詰みの基本。「玉の頭に金」を支えつきで打てば、玉はどこにも逃げられない。',
  steps: (() => {
    const start = bare(
      [
        [5, 1, 'OU', GOTE],
        [6, 3, 'RY', SENTE],
        [9, 9, 'OU', SENTE],
      ],
      { KI: 1 },
    );
    const steps = seq(start, '後手玉は5一。先手は6三に龍、持ち駒に金。詰みの一番の基本形を作れます。', [
      {
        move: { to: sq(5, 2), drop: 'KI' },
        caption: '▲5二金打！ 「玉の頭に金」。金は6三の龍がしっかり支えているので、△同玉とは取れません。',
      },
    ]);
    steps.push({
      pos: steps[steps.length - 1].pos,
      caption:
        '玉の逃げ場を確認: 4一・6一・4二・6二はすべて金の利き、5二は取れない。どこにも行けず詰み！ これが「頭金」です。',
    });
    return steps;
  })(),
};

// ---------- 戦法(居飛車) ----------
// 戦法レッスンは初期局面から実際の合法手で進める(テストで全手の合法性を検証)

const bogin: Lesson = {
  id: 'bogin',
  title: '原始棒銀',
  category: '居飛車',
  summary:
    '飛車の前に銀をまっすぐ繰り出し、歩と銀の力で2筋を突き破る攻めの基本戦法。初心者が最初に覚える攻め方の王道。',
  steps: seq(initialPosition(), '初期局面から。棒銀の目標は「2三の地点」をこじ開けることです。', [
    { move: mv(2, 7, 2, 6), caption: '▲2六歩。まず飛車先の歩を伸ばします。' },
    { move: mv(3, 3, 3, 4), caption: '△3四歩。後手は角道を開けます。' },
    { move: mv(2, 6, 2, 5), caption: '▲2五歩。さらに伸ばして2四への圧力をかけます。' },
    { move: mv(2, 2, 3, 3), caption: '△3三角。▲2四歩の交換を角が受け止めます。' },
    { move: mv(3, 9, 3, 8), caption: '▲3八銀。ここから銀の行進が始まります。' },
    { move: mv(3, 1, 4, 2), caption: '△4二銀。後手も駒組み。' },
    { move: mv(3, 8, 2, 7), caption: '▲2七銀。銀が飛車の前へ。「棒」のようにまっすぐ進むのが名前の由来。' },
    { move: mv(5, 3, 5, 4), caption: '△5四歩。' },
    { move: mv(2, 7, 2, 6), caption: '▲2六銀。歩の後ろにぴったり付きます。' },
    { move: mv(9, 3, 9, 4), caption: '△9四歩。' },
    { move: mv(2, 6, 1, 5), caption: '▲1五銀！ 端に出るのが棒銀の決め手。次の▲2四歩が受けにくい。' },
    { move: mv(9, 4, 9, 5), caption: '△9五歩。後手は有効な受けがありません。' },
    { move: mv(2, 5, 2, 4), caption: '▲2四歩！ いよいよ突破開始。' },
    { move: mv(2, 3, 2, 4), caption: '△同歩。' },
    { move: mv(1, 5, 2, 4), caption: '▲同銀。歩と銀の二段構えで2三の守りを剥がします。' },
    { move: mv(3, 3, 2, 4), caption: '△同角と銀を取りますが…' },
    {
      move: mv(2, 8, 2, 4),
      caption: '▲同飛！ 銀を渡しても角と歩を手に入れ、飛車が敵陣目前へ。棒銀、大成功です。',
    },
  ]),
};

// ---------- 戦法(振り飛車) ----------

const shiken: Lesson = {
  id: 'shiken-bisha',
  title: '四間飛車',
  category: '振り飛車',
  summary:
    '飛車を左から4筋目(6筋)に振る、振り飛車の代表格。美濃囲いとセットで「受けてから反撃」のカウンター将棋。',
  steps: seq(initialPosition(), '振り飛車の中で最も人気のある四間飛車。手順を見てみましょう。', [
    { move: mv(7, 7, 7, 6), caption: '▲7六歩。角道を開けます。' },
    { move: mv(3, 3, 3, 4), caption: '△3四歩。' },
    { move: mv(6, 7, 6, 6), caption: '▲6六歩。角道を止めて角交換を拒否。これが振り飛車の合図です。' },
    { move: mv(8, 3, 8, 4), caption: '△8四歩。後手は飛車先を伸ばしてきます。' },
    { move: mv(2, 8, 6, 8), caption: '▲6八飛！ 左から4筋目(6筋)に飛車を振る＝「四間飛車」。' },
    { move: mv(8, 4, 8, 5), caption: '△8五歩。攻めの姿勢を見せてきますが…' },
    { move: mv(8, 8, 7, 7), caption: '▲7七角。△8六歩の交換は角ががっちり受け止めます。' },
    { move: mv(7, 1, 6, 2), caption: '△6二銀。' },
    {
      move: mv(5, 9, 4, 8),
      caption:
        '▲4八玉。玉は飛車と反対の右側へ。ここから美濃囲い(囲いレッスン参照)に組めば、堅陣からのカウンターが炸裂します。',
    },
  ]),
};

const sanken: Lesson = {
  id: 'sanken-bisha',
  title: '三間飛車',
  category: '振り飛車',
  summary:
    '飛車を左から3筋目(7筋)に振る戦法。軽快なさばきが持ち味で、攻撃的な「石田流」への発展が魅力。',
  steps: seq(initialPosition(), '四間飛車の隣、7筋に振るのが三間飛車です。', [
    { move: mv(7, 7, 7, 6), caption: '▲7六歩。角道を開けます。' },
    { move: mv(3, 3, 3, 4), caption: '△3四歩。' },
    { move: mv(6, 7, 6, 6), caption: '▲6六歩。角道を止めます。' },
    { move: mv(8, 3, 8, 4), caption: '△8四歩。' },
    {
      move: mv(2, 8, 7, 8),
      caption: '▲7八飛！ 左から3筋目(7筋)へ＝「三間飛車」。四間飛車より1筋攻撃的な位置です。',
    },
    { move: mv(8, 4, 8, 5), caption: '△8五歩。' },
    { move: mv(8, 8, 7, 7), caption: '▲7七角。8筋は角で受けます。' },
    { move: mv(7, 1, 6, 2), caption: '△6二銀。' },
    {
      move: mv(5, 9, 4, 8),
      caption:
        '▲4八玉。あとは美濃囲いへ。将来▲7五歩〜▲7六飛と浮けば、攻撃型の「石田流」に発展します。',
    },
  ]),
};

const nakabisha: Lesson = {
  id: 'nakabisha',
  title: '先手中飛車',
  category: '振り飛車',
  summary: '飛車をど真ん中(5筋)に振り、中央から豪快に攻める戦法。「攻める振り飛車」の代表格。',
  steps: seq(initialPosition(), '盤の中央を制圧する中飛車。パワフルな将棋が好きな人におすすめです。', [
    { move: mv(5, 7, 5, 6), caption: '▲5六歩。いきなり中央の歩を突くのが中飛車の第一歩。' },
    { move: mv(3, 3, 3, 4), caption: '△3四歩。' },
    { move: mv(2, 8, 5, 8), caption: '▲5八飛！ ど真ん中に飛車を振る＝「中飛車」。' },
    { move: mv(8, 3, 8, 4), caption: '△8四歩。' },
    { move: mv(7, 7, 7, 6), caption: '▲7六歩。角道も開けておきます。' },
    { move: mv(8, 4, 8, 5), caption: '△8五歩。' },
    { move: mv(8, 8, 7, 7), caption: '▲7七角。8筋を受けつつ…' },
    { move: mv(7, 1, 6, 2), caption: '△6二銀。' },
    {
      move: mv(5, 6, 5, 5),
      caption:
        '▲5五歩！ 5筋の「位(くらい)」を取って中央を制圧。ここから▲4八玉〜美濃囲いに組み、▲5四歩の突破を狙います。',
    },
  ]),
};

// ---------- 囲い ----------

const yagura: Lesson = {
  id: 'yagura',
  title: '矢倉囲い',
  category: '囲い',
  summary: '相居飛車の王道「金矢倉」。金銀3枚が玉をがっちり守る、上からの攻めに強い囲い。',
  steps: frames(initialPosition(), '初期配置から金矢倉を組んでいきます(相手の手は省略)。', [
    [[7, 7], [7, 6], '▲7六歩。まず角道を開けます。'],
    [[7, 9], [6, 8], '▲6八銀。'],
    [[6, 8], [7, 7], '▲7七銀。銀が7七に上がり、8筋からの攻めに備えます。'],
    [[6, 9], [7, 8], '▲7八金。'],
    [[6, 7], [6, 6], '▲6六歩。'],
    [[4, 9], [5, 8], '▲5八金。'],
    [[5, 8], [6, 7], '▲6七金。金2枚が斜めに連結しました。'],
    [[8, 8], [7, 9], '▲7九角。玉の通り道を空けるため角が移動します。'],
    [[7, 9], [6, 8], '▲6八角。'],
    [[5, 9], [6, 9], '▲6九玉。玉が囲いへ向かいます。'],
    [[6, 9], [7, 9], '▲7九玉。'],
    [
      [7, 9],
      [8, 8],
      '▲8八玉で金矢倉の完成！ 玉8八・金7八・銀7七・金6七の4枚が定位置です。対局中にこの形を作ると完成エフェクトが出ます🦊',
    ],
  ]),
};

const mino: Lesson = {
  id: 'mino',
  title: '美濃囲い',
  category: '囲い',
  summary: '振り飛車の相棒。少ない手数で完成し、横からの攻めにめっぽう強いコスパ最強の囲い。',
  steps: frames(initialPosition(), '振り飛車とセットで使う美濃囲い。手数の少なさに注目(相手の手は省略)。', [
    [[2, 8], [6, 8], '▲6八飛。まず飛車を左へ(ここでは四間飛車)。玉の場所を空けます。'],
    [[5, 9], [4, 8], '▲4八玉。玉は飛車と反対の右側へ。'],
    [[4, 8], [3, 8], '▲3八玉。'],
    [[3, 8], [2, 8], '▲2八玉。飛車が元いた場所が玉の新居です。'],
    [[3, 9], [3, 8], '▲3八銀。'],
    [
      [6, 9],
      [5, 8],
      '▲5八金で美濃囲いの完成！ 玉2八・銀3八・金5八・金4九。わずか6手で横からの攻めに強い堅陣ができました。対局中にこの形を作ると完成エフェクトが出ます🦊',
    ],
  ]),
};

const anaguma: Lesson = {
  id: 'anaguma',
  title: '穴熊囲い',
  category: '囲い',
  summary: '玉を隅の「穴」に潜らせて蓋をする最堅の囲い。王手が絶対にかからない安心感が魅力。',
  steps: (() => {
    // 角道を開けて角を7七へ、玉を7八まで移動済みの局面から始める
    let start = initialPosition();
    start = relocate(start, [7, 7], [7, 6]);
    start = relocate(start, [8, 8], [7, 7]);
    start = relocate(start, [5, 9], [7, 8]);
    return frames(
      start,
      '居飛車穴熊。角を7七に上がらせ、玉を7八まで運んだ局面からスタートします(相手の手は省略)。',
      [
        [[9, 9], [9, 8], '▲9八香。香を上がって、玉が潜る「穴」を掘ります。'],
        [[7, 8], [8, 8], '▲8八玉。'],
        [[8, 8], [9, 9], '▲9九玉。玉が穴に潜りました。'],
        [[7, 9], [8, 8], '▲8八銀。銀で蓋をします。'],
        [
          [6, 9],
          [7, 9],
          '▲7九金で穴熊の完成！ 玉9九・香9八・銀8八・金7九。王手がかからない鉄壁の囲いです。対局中にこの形を作ると完成エフェクトが出ます🦊',
        ],
      ],
    );
  })(),
};

export const LESSONS: Lesson[] = [
  fundoshi,
  wariuchi,
  dengaku,
  atamakin,
  bogin,
  shiken,
  sanken,
  nakabisha,
  yagura,
  mino,
  anaguma,
];
