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

export type LessonCategory = '手筋' | '囲い' | '居飛車' | '振り飛車' | '囲い崩し' | '詰みの形';

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
  goteHand: Partial<Record<Base, number>> = {},
): Position {
  const board: Position['board'] = new Array(81).fill(null);
  for (const [file, rank, type, color] of pieces) {
    board[idx(file, rank)] = { type, color };
  }
  const hands: Position['hands'] = [emptyHand(), emptyHand()];
  Object.assign(hands[SENTE], senteHand);
  Object.assign(hands[GOTE], goteHand);
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
        caption:
          '王手なので後手は玉を逃げるしかありません(△4二玉と飛車にヒモをつけても、▲5一桂成△同玉で桂と飛車の交換。それでも先手の大得です)。',
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
  summary:
    '横に並んだ金2枚の「斜め後ろ」に銀を打ち込む両取り。金は斜め後ろに利かない——その死角を銀が突く。',
  steps: (() => {
    const start = bare(
      [
        [2, 2, 'OU', GOTE],
        [3, 2, 'KI', GOTE],
        [5, 2, 'KI', GOTE],
        [1, 1, 'KY', GOTE],
        [2, 1, 'KE', GOTE],
        [1, 3, 'FU', GOTE],
        [2, 3, 'FU', GOTE],
        [9, 9, 'OU', SENTE],
      ],
      { GI: 1 },
    );
    const steps = seq(
      start,
      '後手陣に金が2枚、1マス空けて横に並んでいます(3二と5二)。実はこの形、危険信号です。',
      [
        {
          move: { to: sq(4, 1), drop: 'GI' },
          caption:
            '▲4一銀打！ 銀の斜め後ろの利きが3二と5二、両方の金に同時に当たる「割り打ちの銀」。大事なのは、金は斜め後ろに利かないため、どちらの金もこの銀を取れないこと。',
        },
        {
          move: mv(5, 2, 6, 2),
          caption:
            '片方の金は逃げるしかありません(△4二金と銀に当てながら受けても、▲3二銀成△同金で銀と金の交換になり先手の得)。',
        },
        {
          move: mv(4, 1, 3, 2, true),
          caption: '▲3二銀成。もう片方の金は助かりませんでした。',
        },
        {
          move: mv(2, 2, 3, 2),
          caption: '△同玉と取り返されますが——',
        },
      ],
    );
    steps.push({
      pos: steps[steps.length - 1].pos,
      caption:
        '持ち駒の銀が金に化けて駒得、しかも相手の玉を裸に近い形へ引きずり出しました。「金は斜め後ろに利かない」——横に並んだ金の1マス後ろは、いつでも銀打ちの絶好ポイントです。',
    });
    return steps;
  })(),
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
  category: '詰みの形',
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

const tarefu: Lesson = {
  id: 'tarefu',
  title: '垂れ歩',
  category: '手筋',
  summary:
    '敵陣の一歩手前に歩を打ち、次の「と金」作りを狙う手筋。取られても歩1枚、成功すれば金と同格の駒が敵陣に誕生。',
  steps: (() => {
    const start = bare(
      [
        [4, 1, 'OU', GOTE],
        [3, 1, 'KI', GOTE],
        [2, 1, 'KE', GOTE],
        [1, 1, 'KY', GOTE],
        [1, 3, 'FU', GOTE],
        [2, 8, 'HI', SENTE],
        [9, 9, 'OU', SENTE],
      ],
      { FU: 1 },
    );
    const steps = seq(start, '2筋の歩がお互いいなくなった局面。持ち歩1枚の使いどころです。', [
      {
        move: { to: sq(2, 4), drop: 'FU' },
        caption:
          '▲2四歩打！ 成れる位置の一歩手前に「垂らす」のが垂れ歩。飛車が後ろから支えていて、次の▲2三歩成が受けにくい。',
      },
      {
        move: mv(1, 3, 1, 4),
        caption:
          '後手はこの歩を直接取れず、△3二金と2三を受けても▲2三歩成△同金▲同飛成で金がタダ取られ。受けが利かないので、他の手を指すしかありません。',
      },
      {
        move: mv(2, 4, 2, 3, true),
        caption: '▲2三歩成。「と金」の誕生です！ と金の動きは金と同じ。',
      },
    ]);
    steps.push({
      pos: steps[steps.length - 1].pos,
      caption:
        'このと金は金にも桂にも取られない位置。次の▲2二と(香・桂取り)や▲3二とで敵陣は崩壊します。元手は歩1枚——「と金の遅早」と呼ばれる、遅いようで最速の攻めです。',
    });
    return steps;
  })(),
};

const tsugifu: Lesson = {
  id: 'tsugifu',
  title: '継ぎ歩',
  category: '手筋',
  summary:
    '突き捨てた歩の後ろにもう1枚歩を「継ぐ」ことで、相手の歩を吊り上げて陣形を乱す手筋。垂れ歩との相性が抜群。',
  steps: seq(
    bare(
      [
        [5, 1, 'OU', GOTE],
        [3, 2, 'KI', GOTE],
        [2, 3, 'FU', GOTE],
        [2, 8, 'HI', SENTE],
        [2, 5, 'FU', SENTE],
        [9, 9, 'OU', SENTE],
      ],
      { FU: 1 },
    ),
    '2筋に飛車と歩。ここから歩2枚で敵陣をこじ開けます。',
    [
      { move: mv(2, 5, 2, 4), caption: '▲2四歩。まず突き捨て。' },
      { move: mv(2, 3, 2, 4), caption: '△同歩。' },
      {
        move: { to: sq(2, 5), drop: 'FU' },
        caption: '▲2五歩打！ これが「継ぎ歩」。取った歩のすぐ後ろに、もう一度歩を継ぎます。',
      },
      { move: mv(2, 4, 2, 5), caption: '△同歩。後手の歩が2五まで吊り上げられました。' },
      {
        move: mv(2, 8, 2, 5),
        caption: '▲同飛。歩を取り返しながら飛車が進出。そして注目——2三の地点ががら空きに！',
      },
      { move: mv(5, 1, 6, 2), caption: '後手に有効な受けはなく、玉が逃げ出すくらい。' },
      {
        move: { to: sq(2, 4), drop: 'FU' },
        caption:
          '仕上げは▲2四歩の垂れ歩(前レッスン参照)！ 次の▲2三歩成は、△同金なら▲同飛成でむしろ大歓迎。継ぎ歩→垂れ歩は、歩2枚で敵陣を崩す黄金コンビです。',
      },
    ],
  ),
};

const jujiBisha: Lesson = {
  id: 'juji-bisha',
  title: '十字飛車',
  category: '手筋',
  summary:
    '飛車の「縦と横」の利きを同時に使う両取りの手筋。飛車が十字の中心に座った瞬間、2枚の駒が同時に当たりになる。',
  steps: seq(
    bare(
      [
        [4, 1, 'OU', GOTE],
        [5, 3, 'GI', GOTE],
        [7, 5, 'KA', GOTE],
        [1, 3, 'FU', GOTE],
        [9, 3, 'FU', GOTE],
        [5, 8, 'HI', SENTE],
        [7, 6, 'KE', SENTE],
        [6, 4, 'FU', SENTE],
        [7, 7, 'FU', SENTE],
        [9, 9, 'OU', SENTE],
      ],
      {},
    ),
    '後手の銀(5三)と角(7五)。バラバラに見えますが、5五の地点に注目してください。先手の桂(7六)と歩(6四)が角の退路を先回りして狭めているのもポイントです。',
    [
      {
        move: mv(5, 8, 5, 5),
        caption:
          '▲5五飛！ 縦(5三の銀)と横(7五の角)を同時ににらむ「十字飛車」。角の逃げ場は△6四角・△8四角なら▲同桂、△8六角と引いても6四の歩がラインを止めていて銀を守れません。',
      },
      {
        move: mv(4, 1, 4, 2),
        caption: '後手は△4二玉と銀にヒモをつけて守りました。それなら——',
      },
      {
        move: mv(5, 5, 7, 5),
        caption:
          '▲7五飛、反対側の角をいただきます。両取りの極意は「片方を守れば、もう片方を取る」。飛車は縦横どちらも見られる駒——十字の利きを常に意識しましょう。',
      },
    ],
  ),
};

const hashizeme: Lesson = {
  id: 'hashizeme',
  title: '端攻め',
  category: '手筋',
  summary:
    '守り駒の少ない端(1筋・9筋)を歩・香・桂の「数の攻め」で破る手筋。地味に見えて、終盤の勝敗を分ける急所。',
  steps: seq(
    bare(
      [
        [2, 2, 'OU', GOTE],
        [3, 2, 'KI', GOTE],
        [1, 1, 'KY', GOTE],
        [2, 1, 'KE', GOTE],
        [1, 4, 'FU', GOTE],
        [2, 3, 'FU', GOTE],
        [1, 9, 'KY', SENTE],
        [1, 6, 'FU', SENTE],
        [3, 7, 'KE', SENTE],
        [9, 9, 'OU', SENTE],
      ],
      { FU: 1 },
    ),
    'お互い端歩を突き合った形。1筋に香・歩、そして3七に桂。攻めの準備は完了です。',
    [
      { move: mv(1, 6, 1, 5), caption: '▲1五歩！ 端の歩をぶつけて開戦します。' },
      { move: mv(1, 4, 1, 5), caption: '△同歩。' },
      {
        move: { to: sq(1, 3), drop: 'FU' },
        caption: 'すぐ取り返さず▲1三歩打！ 香の頭に歩を垂らすのが端攻めの手筋です。',
      },
      { move: mv(1, 1, 1, 3), caption: '△同香。香が前に釣り出されました。そこで——' },
      {
        move: mv(3, 7, 2, 5),
        caption:
          '▲2五桂！ 桂が香に飛びかかります。△1四香と逃げれば▲1五香(歩を取りつつ追撃)でどのみち捕獲。歩→香→桂と数を足していく「数の攻め」が端攻めの極意です。',
      },
    ],
  ),
};

const keiTakatobi: Lesson = {
  id: 'kei-takatobi',
  title: '桂の高跳び歩の餌食（格言）',
  category: '手筋',
  summary:
    '桂馬は将棋で唯一「後ろに戻れない」駒。支援なしで跳ねた桂が歩1枚に捕まる様子から、跳ぶタイミングの大切さを学ぶ。',
  steps: (() => {
    const start = bare(
      [
        [5, 1, 'OU', GOTE],
        [1, 1, 'KY', GOTE],
        [2, 1, 'KE', GOTE],
        [1, 3, 'FU', GOTE],
        [2, 3, 'FU', GOTE],
        [3, 3, 'FU', GOTE],
        [3, 7, 'KE', SENTE],
        [9, 9, 'OU', SENTE],
      ],
      {},
    );
    const steps = seq(start, '先手の桂が3七で出番を待っています。しかし、支援なしで跳ぶと…？', [
      {
        move: mv(3, 7, 2, 5),
        caption: '▲2五桂!? 威勢よく跳ねましたが、この桂を支える味方がいません。',
      },
      {
        move: mv(2, 3, 2, 4),
        caption:
          '△2四歩！ 歩がそっと伸びてきました。次に△2五歩と取られてしまうのに、桂の行き先は1三と3三だけ…',
      },
      {
        move: mv(2, 5, 3, 3, true),
        caption: '仕方なく▲3三桂成と突っ込みますが(▲1三桂成にも△同香)…',
      },
      { move: mv(2, 1, 3, 3), caption: '△同桂。あっさり捕獲されてしまいました。' },
    ]);
    steps.push({
      pos: steps[steps.length - 1].pos,
      caption:
        '格言「桂の高跳び歩の餌食」。桂は戻れない駒だからこそ、跳ぶのは歩や銀の支援が整ってから。端攻めレッスンの▲2五桂(香を狙う明確な目標つき)と見比べてみてください。',
    });
    return steps;
  })(),
};

const kinzoko: Lesson = {
  id: 'kinzoko-fu',
  title: '金底の歩（きんぞこのふ）',
  category: '手筋',
  summary:
    '「金底の歩、岩より堅し」。一段目に侵入した飛車・龍の横利きを、金の底に打つ歩1枚でシャットアウトする防御の手筋。',
  steps: (() => {
    const start = bare(
      [
        [5, 1, 'OU', GOTE],
        [1, 3, 'FU', GOTE],
        [9, 3, 'FU', GOTE],
        [8, 9, 'RY', GOTE],
        [2, 8, 'OU', SENTE],
        [3, 8, 'GI', SENTE],
        [4, 9, 'KI', SENTE],
        [5, 8, 'KI', SENTE],
        [1, 7, 'FU', SENTE],
        [2, 6, 'FU', SENTE],
        [3, 7, 'FU', SENTE],
        [4, 7, 'FU', SENTE],
      ],
      { FU: 1 },
    );
    const steps = seq(
      start,
      '大変！ 後手の龍が一段目(8九)に侵入し、横利きが美濃囲いの金(4九)を直撃しています。',
      [
        {
          move: { to: sq(5, 9), drop: 'FU' },
          caption:
            '▲5九歩打！ 金の底に歩を打つ「金底の歩」。龍の横利きがピタリと止まりました。この歩は5八の金が守っていて、△同龍なら▲同金で龍がタダです。',
        },
      ],
    );
    steps.push({
      pos: steps[steps.length - 1].pos,
      caption:
        '「金底の歩、岩より堅し」——龍はもう何もできません。放置していれば△4九龍から美濃囲いが崩壊するところでした。攻めだけでなく、受けにも歩は大活躍します。',
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

const hayakuri: Lesson = {
  id: 'hayakuri-gin',
  title: '早繰り銀',
  category: '居飛車',
  summary:
    '銀を4七→5六→4五と最短ルートで前線に送り込むスピード戦法。棒銀より柔軟で、プロでも大流行。',
  steps: seq(initialPosition(), '「早く銀を繰り出す」から早繰り銀。銀の走るルートに注目です。', [
    { move: mv(2, 7, 2, 6), caption: '▲2六歩。飛車先を突いて…' },
    { move: mv(8, 3, 8, 4), caption: '△8四歩。' },
    { move: mv(2, 6, 2, 5), caption: '▲2五歩。' },
    { move: mv(8, 4, 8, 5), caption: '△8五歩。' },
    { move: mv(6, 9, 7, 8), caption: '▲7八金。8筋をしっかり受けます。' },
    { move: mv(4, 1, 3, 2), caption: '△3二金。' },
    { move: mv(3, 9, 3, 8), caption: '▲3八銀。ここから銀が走ります。' },
    { move: mv(3, 3, 3, 4), caption: '△3四歩。' },
    { move: mv(3, 7, 3, 6), caption: '▲3六歩。銀の通り道を先に作っておくのがポイント。' },
    { move: mv(7, 1, 6, 2), caption: '△6二銀。' },
    { move: mv(3, 8, 3, 7), caption: '▲3七銀。棒銀(2七ルート)と違い、こちらは3七から中央寄りへ。' },
    { move: mv(5, 1, 4, 2), caption: '△4二玉。' },
    { move: mv(3, 7, 4, 6), caption: '▲4六銀。銀が最前線に到着。ここから仕掛けます。' },
    { move: mv(6, 1, 5, 2), caption: '△5二金。' },
    { move: mv(3, 6, 3, 5), caption: '▲3五歩！ 銀の力を借りて3筋から仕掛けます。' },
    { move: mv(3, 4, 3, 5), caption: '△同歩。' },
    {
      move: mv(4, 6, 3, 5),
      caption:
        '▲同銀。歩をかすめ取りながら銀が進出。次は▲2四歩△同歩▲同飛の突破と▲3四歩の押し込み、2つの狙いが同時に残り、受けるのは大変です。',
    },
  ]),
};

const kakugawari: Lesson = {
  id: 'kakugawari',
  title: '角換わり',
  category: '居飛車',
  summary:
    '序盤早々にお互いの角を交換する本格派の戦法。持ち駒の角の「打ち込み」をめぐる高度な駒組みが魅力。',
  steps: seq(initialPosition(), '角交換までの手順と、そのあとの世界を覗いてみましょう。', [
    { move: mv(2, 7, 2, 6), caption: '▲2六歩。' },
    { move: mv(8, 3, 8, 4), caption: '△8四歩。' },
    { move: mv(7, 7, 7, 6), caption: '▲7六歩。角道を開けます。' },
    { move: mv(8, 4, 8, 5), caption: '△8五歩。' },
    { move: mv(8, 8, 7, 7), caption: '▲7七角。まず8筋を受けて…' },
    { move: mv(3, 3, 3, 4), caption: '△3四歩。後手も角道を開けると、角同士がにらみ合います。' },
    { move: mv(7, 9, 8, 8), caption: '▲8八銀。角交換に備えて銀を上がっておきます。' },
    { move: mv(2, 2, 7, 7, true), caption: '△7七角成。後手から角交換を仕掛けてきました。' },
    { move: mv(8, 8, 7, 7), caption: '▲同銀。これで「角換わり」の出来上がり。お互い角を持ち駒にしています。' },
    { move: mv(3, 1, 3, 2), caption: '△3二銀。' },
    {
      move: mv(6, 9, 7, 8),
      caption:
        '▲7八金。ここからはお互い、角を打ち込まれるスキ(空いたマス)を作らないよう慎重に駒組み。腰掛け銀や早繰り銀と組み合わせて戦います。',
    },
  ]),
};

const aigakari: Lesson = {
  id: 'aigakari',
  title: '相掛かり・飛車先の歩交換',
  category: '居飛車',
  summary:
    'お互い飛車先の歩を突き合う力戦調の戦法。基本技「飛車先の歩交換」で持ち歩を手に入れる手順を学ぶ。',
  steps: seq(initialPosition(), '相掛かりの基本、「飛車先の歩交換」。タダで歩が手に入る…？', [
    { move: mv(2, 7, 2, 6), caption: '▲2六歩。' },
    { move: mv(8, 3, 8, 4), caption: '△8四歩。お互い飛車先を突き合うのが「相掛かり」。' },
    { move: mv(2, 6, 2, 5), caption: '▲2五歩。' },
    { move: mv(8, 4, 8, 5), caption: '△8五歩。' },
    { move: mv(6, 9, 7, 8), caption: '▲7八金。歩交換の前に8筋を受けておくのが大事な準備。' },
    { move: mv(4, 1, 3, 2), caption: '△3二金。後手も同じく受けます。' },
    { move: mv(2, 5, 2, 4), caption: '▲2四歩！ いよいよ歩交換へ。' },
    { move: mv(2, 3, 2, 4), caption: '△同歩。' },
    { move: mv(2, 8, 2, 4), caption: '▲同飛。飛車が敵陣の目前まで進出しました。' },
    { move: { to: sq(2, 3), drop: 'FU' }, caption: '△2三歩打。後手は取った歩を打って蓋をします。' },
    {
      move: mv(2, 4, 2, 8),
      caption:
        '▲2八飛。飛車は定位置へ帰還。成果は「持ち歩1枚」— この歩が後々、継ぎ歩や垂れ歩などの攻めの資源になります。',
    },
  ]),
};

const koshikake: Lesson = {
  id: 'koshikake-gin',
  title: '腰掛け銀',
  category: '居飛車',
  summary:
    '銀が5六の地点に「腰掛ける」、攻守バランス型の布陣。角換わりと組み合わせた「角換わり腰掛け銀」はプロの最重要戦型。',
  steps: seq(initialPosition(), '中央の要所・5六に銀を運ぶ手順を見てみましょう。', [
    { move: mv(2, 7, 2, 6), caption: '▲2六歩。' },
    { move: mv(8, 3, 8, 4), caption: '△8四歩。' },
    { move: mv(2, 6, 2, 5), caption: '▲2五歩。' },
    { move: mv(8, 4, 8, 5), caption: '△8五歩。' },
    { move: mv(6, 9, 7, 8), caption: '▲7八金。' },
    { move: mv(4, 1, 3, 2), caption: '△3二金。' },
    { move: mv(3, 9, 3, 8), caption: '▲3八銀。' },
    { move: mv(3, 3, 3, 4), caption: '△3四歩。' },
    { move: mv(4, 7, 4, 6), caption: '▲4六歩。銀の通り道を開けます。' },
    { move: mv(7, 1, 6, 2), caption: '△6二銀。' },
    { move: mv(3, 8, 4, 7), caption: '▲4七銀。早繰り銀(3七ルート)とは違う道を進みます。' },
    { move: mv(5, 1, 4, 2), caption: '△4二玉。' },
    {
      move: mv(4, 7, 5, 6),
      caption:
        '▲5六銀。これが「腰掛け銀」——5七の歩を椅子にして銀が腰掛けた形です。攻めては▲4五歩や▲6五歩の仕掛け、守っては中央制圧。じっくり型の本格派布陣です。',
    },
  ]),
};

const migiShiken: Lesson = {
  id: 'migi-shiken',
  title: '右四間飛車',
  category: '居飛車',
  summary:
    '飛車を右から4筋目に移動し、銀・桂・歩を総動員して一点突破を狙う破壊力No.1の戦法。相手が角道を止めたら発動のチャンス。',
  steps: seq(initialPosition(), '相手の「角道を止める歩」を標的にする、豪快な戦法です。', [
    { move: mv(7, 7, 7, 6), caption: '▲7六歩。' },
    { move: mv(3, 3, 3, 4), caption: '△3四歩。' },
    { move: mv(2, 8, 4, 8), caption: '▲4八飛！ 右から4筋目に飛車を回る「右四間飛車」。' },
    { move: mv(4, 3, 4, 4), caption: '△4四歩。後手は角道を止めました(四間飛車を目指す構え)。この歩こそ右四間の標的です。' },
    { move: mv(4, 7, 4, 6), caption: '▲4六歩。飛車の道を通します。' },
    { move: mv(8, 2, 4, 2), caption: '△4二飛。後手は四間飛車。同じ4筋で飛車がにらみ合う対抗形に。' },
    { move: mv(3, 9, 3, 8), caption: '▲3八銀。攻撃部隊を編成します。' },
    { move: mv(7, 1, 7, 2), caption: '△7二銀。' },
    { move: mv(3, 8, 4, 7), caption: '▲4七銀。' },
    { move: mv(5, 1, 6, 2), caption: '△6二玉。後手は美濃囲いへ。' },
    { move: mv(4, 7, 5, 6), caption: '▲5六銀。銀も4五を支援する位置に。' },
    { move: mv(6, 2, 7, 1), caption: '△7一玉。' },
    {
      move: mv(4, 6, 4, 5),
      caption:
        '▲4五歩！ 飛車・銀の力を集めた一点突破の仕掛け。△同歩なら▲同銀でどんどん食いつきます。分かりやすい攻めの破壊力はまさにNo.1。',
    },
  ]),
};

const yokofudori: Lesson = {
  id: 'yokofudori',
  title: '横歩取り',
  category: '居飛車',
  summary:
    'お互い飛車先の歩を交換したあと、3四の「横歩」を飛車でかすめ取る超急戦。プロで大流行した、スリル満点の戦型。',
  steps: seq(initialPosition(), '1歩得を巡って、序盤からいきなり火花が散る「横歩取り」の世界へ。', [
    { move: mv(2, 7, 2, 6), caption: '▲2六歩。' },
    { move: mv(3, 3, 3, 4), caption: '△3四歩。' },
    { move: mv(7, 7, 7, 6), caption: '▲7六歩。お互い角道を開けます。' },
    { move: mv(8, 3, 8, 4), caption: '△8四歩。' },
    { move: mv(2, 6, 2, 5), caption: '▲2五歩。' },
    { move: mv(8, 4, 8, 5), caption: '△8五歩。' },
    {
      move: mv(6, 9, 7, 8),
      caption: '▲7八金。この金が8八の角を守る大事な一手。後の展開の伏線です。',
    },
    { move: mv(4, 1, 3, 2), caption: '△3二金。後手も同様に備えます。' },
    { move: mv(2, 5, 2, 4), caption: '▲2四歩。飛車先の歩交換へ。' },
    { move: mv(2, 3, 2, 4), caption: '△同歩。' },
    { move: mv(2, 8, 2, 4), caption: '▲同飛。' },
    { move: mv(8, 5, 8, 6), caption: '△8六歩。後手も同じように歩交換してきます。' },
    { move: mv(8, 7, 8, 6), caption: '▲同歩。' },
    { move: mv(8, 2, 8, 6), caption: '△同飛。お互いの飛車が中空に浮かび合ったこの瞬間——' },
    {
      move: mv(2, 4, 3, 4),
      caption:
        '▲3四飛！ 3四の歩を横取りするから「横歩取り」。先手は1歩得ですが、後手は攻めの主導権を握れる——ここから将棋界屈指の激しい戦いが始まります。なお8八の角は▲7八金がしっかり守っています。',
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

const mukai: Lesson = {
  id: 'mukai-bisha',
  title: '向かい飛車',
  category: '振り飛車',
  summary:
    '相手の飛車の正面(8筋)に飛車を振る戦法。相手の攻めをそのまま反撃のエネルギーに変える、カウンターの極み。',
  steps: seq(initialPosition(), '相手の飛車と「向かい合う」から向かい飛車。8筋での逆襲を狙います。', [
    { move: mv(7, 7, 7, 6), caption: '▲7六歩。' },
    { move: mv(3, 3, 3, 4), caption: '△3四歩。' },
    { move: mv(6, 7, 6, 6), caption: '▲6六歩。角道を止めて振り飛車宣言。' },
    { move: mv(8, 3, 8, 4), caption: '△8四歩。' },
    { move: mv(8, 8, 7, 7), caption: '▲7七角。先に角で8筋を受けておきます。' },
    { move: mv(8, 4, 8, 5), caption: '△8五歩。後手は勢いよく飛車先を伸ばしてきますが…' },
    {
      move: mv(2, 8, 8, 8),
      caption: '▲8八飛！ 相手の飛車の真正面へ。これが「向かい飛車」です。',
    },
    { move: mv(7, 1, 6, 2), caption: '△6二銀。' },
    {
      move: mv(5, 9, 4, 8),
      caption:
        '▲4八玉。美濃囲いに組んだあと、機を見て▲8六歩から8筋を逆襲するのが向かい飛車の醍醐味。相手の攻め筋がそのまま自分の攻め筋になります。',
    },
  ]),
};

const ishida: Lesson = {
  id: 'ishida',
  title: '石田流（三間飛車の発展形）',
  category: '振り飛車',
  summary:
    '三間飛車から▲7五歩と伸ばし、飛車を7六に「浮かせる」攻撃的布陣。振り飛車ながら自分から攻められるのが魅力。',
  steps: seq(initialPosition(), '三間飛車の進化形、石田流。飛車が歩の上に浮く独特の構えを作ります。', [
    { move: mv(7, 7, 7, 6), caption: '▲7六歩。' },
    { move: mv(3, 3, 3, 4), caption: '△3四歩。' },
    { move: mv(7, 6, 7, 5), caption: '▲7五歩！ 2手目からさらに伸ばすこの歩が「石田流」の合図。' },
    { move: mv(8, 3, 8, 4), caption: '△8四歩。' },
    { move: mv(2, 8, 7, 8), caption: '▲7八飛。三間飛車に振って…' },
    { move: mv(8, 4, 8, 5), caption: '△8五歩。' },
    { move: mv(5, 9, 4, 8), caption: '▲4八玉。玉を右へ。美濃囲いの準備です。' },
    { move: mv(7, 1, 6, 2), caption: '△6二銀。' },
    {
      move: mv(7, 8, 7, 6),
      caption:
        '▲7六飛！ 飛車が歩の上に浮く「石田流本組み」の骨格が完成。飛車が横に自由に動けるうえ、▲7四歩の仕掛けをいつでも狙える攻撃的な構えです。',
    },
  ]),
};

const hayaIshida: Lesson = {
  id: 'haya-ishida',
  title: '早石田の速攻',
  category: '振り飛車',
  summary:
    'わずか9手で飛車が敵陣に迫る、三間飛車の超急戦バージョン。じっくり組む「石田流本組み」と対になる速攻ルート。',
  steps: seq(initialPosition(), '石田流(本組み)レッスンのスピード重視版。出だし数手で勝負を仕掛けます。', [
    { move: mv(7, 7, 7, 6), caption: '▲7六歩。' },
    { move: mv(3, 3, 3, 4), caption: '△3四歩。' },
    { move: mv(7, 6, 7, 5), caption: '▲7五歩。石田流の合図。' },
    { move: mv(8, 3, 8, 4), caption: '△8四歩。' },
    { move: mv(2, 8, 7, 8), caption: '▲7八飛。三間飛車に振って…' },
    { move: mv(8, 4, 8, 5), caption: '△8五歩。' },
    { move: mv(7, 5, 7, 4), caption: '▲7四歩！ もう仕掛けます。' },
    { move: mv(7, 3, 7, 4), caption: '△同歩。' },
    {
      move: mv(7, 8, 7, 4),
      caption:
        '▲同飛。歩を交換しながら飛車が7四へ進出し、後手陣を上から押さえ込みました。序盤からいきなり主導権を握れるのが早石田の魅力です(※△4五角の反撃筋など危険もある上級者向けの急戦。まずは本組みから覚えるのがおすすめ)。',
    },
  ]),
};

const kakukoukan: Lesson = {
  id: 'kakukoukan-shiken',
  title: '角交換四間飛車',
  category: '振り飛車',
  summary:
    'あえて角交換を受け入れる現代型の四間飛車。持ち角の打ち込みを狙いつつ、美濃囲いでじっくり構える人気戦法。',
  steps: seq(initialPosition(), '普通の四間飛車は▲6六歩で角道を止めますが、この戦法は止めません。', [
    { move: mv(7, 7, 7, 6), caption: '▲7六歩。' },
    { move: mv(3, 3, 3, 4), caption: '△3四歩。' },
    {
      move: mv(2, 8, 6, 8),
      caption: '▲6八飛！ ▲6六歩を突かずにいきなり飛車を振るのがポイント。角交換を全く恐れていません。',
    },
    {
      move: mv(2, 2, 8, 8, true),
      caption: '△8八角成。後手は角交換を仕掛けてきました。',
    },
    { move: mv(7, 9, 8, 8), caption: '▲同銀。これで「角交換四間飛車」の基本形。お互い角が持ち駒に。' },
    { move: mv(5, 1, 4, 2), caption: '△4二玉。' },
    { move: mv(5, 9, 4, 8), caption: '▲4八玉。ここからお互い玉を囲い合います。' },
    { move: mv(4, 2, 3, 2), caption: '△3二玉。' },
    { move: mv(4, 8, 3, 8), caption: '▲3八玉。' },
    { move: mv(6, 1, 5, 2), caption: '△5二金。' },
    { move: mv(3, 8, 2, 8), caption: '▲2八玉。玉が定位置に到着。' },
    { move: mv(3, 1, 2, 2), caption: '△2二銀。後手は角の打ち込みを警戒します。' },
    {
      move: mv(3, 9, 3, 8),
      caption:
        '▲3八銀。美濃囲いの骨格ができました。ここから隙あらば▲6五角や▲8三角の打ち込みを狙う、「じわじわ系」の現代振り飛車です。',
    },
  ]),
};

// ---------- 詰みの形 ----------

const haragin: Lesson = {
  id: 'haragin',
  title: '腹銀（はらぎん）',
  category: '詰みの形',
  summary:
    '玉の真横(腹)に銀を打つ、王手じゃないのに受けがない恐怖の一手。銀の斜めの利きが玉の逃げ道を全部消す。',
  steps: (() => {
    const start = bare(
      [
        [1, 2, 'OU', GOTE],
        [1, 1, 'KY', GOTE],
        [2, 4, 'FU', GOTE],
        [3, 3, 'RY', SENTE],
        [9, 9, 'OU', SENTE],
        [9, 8, 'FU', SENTE],
      ],
      { GI: 1 },
      { FU: 1 },
    );
    const steps = seq(
      start,
      '後手玉は1二。持ち駒は銀1枚だけ。王手をかけても(▲2三銀は△2一玉、▲1三銀は△2一玉)逃げられて、即詰みはありません。ここで——',
      [
        {
          move: { to: sq(2, 2), drop: 'GI' },
          caption:
            '▲2二銀打！ 玉の腹(真横)に銀。王手ではありませんが、玉は完全に動けなくなりました(1一は自分の香、1三・2一・2三は銀と龍の利き、銀自身は龍が斜めに支えていて取れない)。狙いは次の▲1三龍！',
        },
        {
          move: mv(2, 4, 2, 5),
          caption:
            '受けたいのに、2三への合駒は2四に自分の歩がいて二歩。△1三歩と打っても▲同龍(銀が支えています)で同じこと。有効な受けがありません。',
        },
        {
          move: mv(3, 3, 1, 3),
          caption: '▲1三龍！ これで詰みです。',
        },
      ],
    );
    steps.push({
      pos: steps[steps.length - 1].pos,
      caption:
        '龍が1筋を貫き、銀が1三・2一・2二・2三をすべて制圧。逃げ場も合駒もありません。「王手は追う手、腹銀は縛る手」——王手をかけない静かな一手が、一番厳しいこともあるのです。',
    });
    return steps;
  })(),
};

const chudangyoku: Lesson = {
  id: 'chudan-gyoku',
  title: '中段玉の寄せ',
  category: '詰みの形',
  summary:
    '盤の中段に逃げ出した玉は捕まえにくい(格言「中段玉は寄せにくし」)。退路を断ってから包み込む寄せの設計図。',
  steps: (() => {
    const start = bare(
      [
        [5, 4, 'OU', GOTE],
        [2, 3, 'HI', SENTE],
        [5, 6, 'FU', SENTE],
        [6, 6, 'FU', SENTE],
        [4, 6, 'GI', SENTE],
        [9, 9, 'OU', SENTE],
      ],
      { KI: 1 },
    );
    const steps = seq(
      start,
      '後手玉が5四の中段まで逃げ出してきました。しかし——注目は2三の飛車。玉の「帰り道」である三段目を横からまるごと封鎖しています。',
      [
        {
          move: { to: sq(5, 5), drop: 'KI' },
          caption: '▲5五金打！ 5六の歩が支えた、いわば「中段の頭金」です。',
        },
      ],
    );
    steps.push({
      pos: steps[steps.length - 1].pos,
      caption:
        '詰み！ 4三・5三・6三は飛車の横利き、4四・6四は金の斜め、4五は銀、6五は歩がカバー。「玉は包むように寄せよ」——退路の封鎖(飛車)→包囲(銀・歩)→とどめ(金)の3ステップでした。',
    });
    return steps;
  })(),
};

const hisshi: Lesson = {
  id: 'hisshi',
  title: '必至（ひっし）の基本',
  category: '詰みの形',
  summary:
    '「次に詰ますよ」という手のうち、どうやっても受からないものが必至。王手のない静かな一手で勝負が決まる。',
  steps: (() => {
    const start = bare(
      [
        [1, 1, 'OU', GOTE],
        [1, 3, 'FU', GOTE],
        [2, 3, 'FU', GOTE],
        [3, 5, 'RY', SENTE],
        [9, 9, 'OU', SENTE],
        [9, 8, 'FU', SENTE],
      ],
      { KI: 1 },
      { FU: 1 },
    );
    const steps = seq(
      start,
      '後手玉は1一。持ち駒は金1枚。すぐ▲2二金と打っても支えがなく△同玉と取られるだけ——即詰みはありません。そこで——',
      [
        {
          move: mv(3, 5, 3, 2),
          caption:
            '▲3二龍！ 王手ではない静かな一手。しかし次の▲2二金(龍が真横から支える)がどうやっても受かりません。玉は1二も2一も龍の利きで動けず、合駒を打とうにも1筋・2筋は自分の歩がいて二歩——これが「必至」です。',
        },
        {
          move: mv(2, 3, 2, 4),
          caption: '受けが存在しないので、後手は歩を突くくらいしかありません。',
        },
        {
          move: { to: sq(2, 2), drop: 'KI' },
          caption: '▲2二金打。宣言どおりの詰みです。金自身が1二と2一を押さえ、龍が金を支えています。',
        },
      ],
    );
    steps.push({
      pos: steps[steps.length - 1].pos,
      caption:
        '受けが1つも存在しない詰めろ＝「必至」(単なる「詰めろ」は受けが残っている)。王手の連続で追いかけるより、静かに退路と受けを断つほうが確実に勝てます。',
    });
    return steps;
  })(),
};

// ---------- 囲いの崩し方 ----------

const minoKuzushi: Lesson = {
  id: 'mino-kuzushi',
  title: '美濃崩し ▲7一銀',
  category: '囲い崩し',
  summary:
    '横に堅い美濃囲いの急所は、玉のナナメ後ろ(7一)。銀→金のコンビネーションで一気に即詰みまで持っていく必修手順。',
  steps: (() => {
    const start = bare(
      [
        [8, 2, 'OU', GOTE],
        [7, 2, 'GI', GOTE],
        [6, 1, 'KI', GOTE],
        [5, 2, 'KI', GOTE],
        [9, 1, 'KY', GOTE],
        [8, 1, 'KE', GOTE],
        [9, 3, 'FU', GOTE],
        [7, 3, 'FU', GOTE],
        [6, 3, 'FU', GOTE],
        [5, 3, 'FU', GOTE],
        [2, 1, 'RY', SENTE],
        [9, 9, 'OU', SENTE],
      ],
      { GI: 1, KI: 1 },
    );
    const steps = seq(
      start,
      '相手は鉄壁の美濃囲い。でも龍が一段目に入り、持ち駒に銀と金があれば——実はもう詰んでいます。',
      [
        {
          move: { to: sq(7, 1), drop: 'GI' },
          caption:
            '▲7一銀打！ 銀の斜め後ろの利きで王手。△同金と取ると6一の守りが消え、一段目を通る龍の横利きで▲同龍!と美濃が崩壊します。',
        },
        { move: mv(8, 2, 9, 2), caption: '△9二玉と端に逃げるのが最善ですが——' },
        {
          move: { to: sq(8, 2), drop: 'KI' },
          caption: '▲8二金打！ 7一の銀が金をしっかり支えています。',
        },
      ],
    );
    steps.push({
      pos: steps[steps.length - 1].pos,
      caption:
        '詰み！ 9一の香・9三の歩・8一の桂——美濃の駒たちが全部、玉自身の壁になってしまいました。▲7一銀→△9二玉→▲8二金は「美濃崩し」の必修コンビネーション。玉のナナメ後ろが美濃の泣きどころです。',
    });
    return steps;
  })(),
};

const yaguraKuzushi: Lesson = {
  id: 'yagura-kuzushi',
  title: '矢倉崩しは端から',
  category: '囲い崩し',
  summary:
    '金銀3枚の矢倉は正面から攻めても崩れない。守り駒が届かない端(1筋)に歩・香・桂を集中させるのが攻略の定石。',
  steps: seq(
    bare(
      [
        [2, 2, 'OU', GOTE],
        [3, 2, 'KI', GOTE],
        [3, 3, 'GI', GOTE],
        [4, 3, 'KI', GOTE],
        [1, 1, 'KY', GOTE],
        [2, 1, 'KE', GOTE],
        [1, 3, 'FU', GOTE],
        [2, 3, 'FU', GOTE],
        [3, 4, 'FU', GOTE],
        [4, 4, 'FU', GOTE],
        [1, 9, 'KY', SENTE],
        [1, 5, 'FU', SENTE],
        [3, 7, 'KE', SENTE],
        [9, 9, 'OU', SENTE],
      ],
      {},
    ),
    '後手は完璧な金矢倉。でもよく見ると、金銀は2〜4筋に固まっていて1筋はガラ空きです。',
    [
      { move: mv(1, 5, 1, 4), caption: '▲1四歩！ 端から仕掛けます。' },
      { move: mv(1, 3, 1, 4), caption: '△同歩。' },
      { move: mv(1, 9, 1, 4), caption: '▲同香。香が一気に前線へ。' },
      { move: { to: sq(1, 3), drop: 'FU' }, caption: '△1三歩と蓋をしますが…' },
      {
        move: mv(3, 7, 2, 5),
        caption: '▲2五桂！ 1三の歩と3三の銀を同時に狙う跳躍。矢倉の守り駒は誰も端に届きません。',
      },
      { move: mv(3, 3, 2, 4), caption: '△2四銀と逃げますが、1三は守れません。' },
      {
        move: mv(2, 5, 1, 3, true),
        caption: '▲1三桂成！ 王手です。',
      },
      { move: mv(1, 1, 1, 3), caption: '△同香。' },
      {
        move: mv(1, 4, 1, 3, true),
        caption:
          '▲同香成、ふたたび王手！ △同玉と取るしかありませんが、囲いを離れた玉は裸同然。「矢倉攻略は端から」——金銀の届かない場所を攻めるのが囲い崩しの大原則です。',
      },
    ],
  ),
};

const anagumaKuzushi: Lesson = {
  id: 'anaguma-kuzushi',
  title: '穴熊崩しは「剥がして引きずり出す」',
  category: '囲い崩し',
  summary:
    '王手のかからない最堅の穴熊も、金銀を1枚ずつ剥がせばただの裸の玉。駒を惜しまず交換を迫るのが攻略の鉄則。',
  steps: (() => {
    const start = bare(
      [
        [1, 1, 'OU', GOTE],
        [1, 2, 'KY', GOTE],
        [2, 1, 'KE', GOTE],
        [2, 2, 'GI', GOTE],
        [3, 1, 'KI', GOTE],
        [1, 3, 'FU', GOTE],
        [2, 3, 'TO', SENTE],
        [5, 5, 'KA', SENTE],
        [9, 9, 'OU', SENTE],
      ],
      { KI: 1 },
    );
    const steps = seq(
      start,
      '相手は鉄壁の穴熊。しかしこちらは「と金」を作り、角のラインも2二に通っています。準備は整いました。',
      [
        {
          move: mv(2, 3, 2, 2),
          caption:
            '▲2二と！ と金が銀に体当たり、しかも王手。取られても元は歩1枚、相手は銀を失う——穴熊攻めの主役「と金」の面目躍如です。',
        },
        { move: mv(3, 1, 2, 2), caption: '△同金と剥がされた金が出てきますが…' },
        {
          move: mv(5, 5, 2, 2, true),
          caption: '▲同角成！ 続けて2枚目。金を取り返しながら馬になり、再び王手です。',
        },
        {
          move: mv(1, 1, 2, 2),
          caption: '△同玉。もう取る駒はこれしかありません——玉自身です。',
        },
      ],
    );
    steps.push({
      pos: steps[steps.length - 1].pos,
      caption:
        '見てください、金銀を全部剥がされて玉が穴から引きずり出されました。こちらの持ち駒には銀と金。あとは寄せるだけです。「穴熊は詰まそうとするな、まず剥がせ」——駒の損得より、守り駒を消すことを優先するのが穴熊攻略の鉄則です。',
    });
    return steps;
  })(),
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

const ginkanmuri: Lesson = {
  id: 'ginkanmuri',
  title: '銀冠（ぎんかんむり）',
  category: '囲い',
  summary:
    '美濃囲いの進化形。銀が玉の頭上に「冠」のように乗り、美濃の弱点だった上からの攻めに強くなる。',
  steps: (() => {
    // 美濃囲いの完成形から始める
    let start = initialPosition();
    start = relocate(start, [2, 8], [6, 8]); // 飛
    start = relocate(start, [5, 9], [2, 8]); // 玉
    start = relocate(start, [3, 9], [3, 8]); // 銀
    start = relocate(start, [6, 9], [5, 8]); // 金
    return frames(start, '美濃囲いの完成形からスタート(美濃囲いレッスン参照)。さらに堅くします。', [
      [[2, 7], [2, 6], '▲2六歩。銀が登るスペースを作ります。'],
      [[3, 8], [2, 7], '▲2七銀！ 銀が玉の頭上へ。この形が「冠」に見えることから銀冠。'],
      [
        [4, 9],
        [3, 8],
        '▲3八金で銀冠の完成！ 玉2八・銀2七・金3八・金5八。美濃が苦手だった上から(玉頭)の攻めに強く、終盤戦での粘りが段違いです。対局中に組むとエフェクトが出ます🦊',
      ],
    ]);
  })(),
};

const takamino: Lesson = {
  id: 'takamino',
  title: '高美濃（たかみの）',
  category: '囲い',
  summary:
    '美濃囲いの金を一段上げた発展形。横に加えて斜め上からの攻めにも強くなり、桂の活用も見込める万能形。',
  steps: (() => {
    // 美濃囲いの完成形から始める
    let start = initialPosition();
    start = relocate(start, [2, 8], [6, 8]); // 飛
    start = relocate(start, [5, 9], [2, 8]); // 玉
    start = relocate(start, [3, 9], [3, 8]); // 銀
    start = relocate(start, [6, 9], [5, 8]); // 金
    return frames(start, '美濃囲いの完成形からスタート。金をぐっと持ち上げます。', [
      [[4, 7], [4, 6], '▲4六歩。金の上がるスペースを作ります。'],
      [
        [5, 8],
        [4, 7],
        '▲4七金！ 金が一段上がって「高美濃」の完成。横一辺倒だった美濃が、斜め上からの攻めにも強くなりました。対局中に組むとエフェクトが出ます🦊',
      ],
      [
        [3, 7],
        [3, 6],
        '▲3六歩。▲3七桂の活用も視野に入れた攻守バランスの良い形です。さらに▲2六歩〜▲2七銀と発展させれば銀冠(銀冠レッスン参照)。美濃→高美濃→銀冠は振り飛車の王道進化ルートです。',
      ],
    ]);
  })(),
};

const kanigakoi: Lesson = {
  id: 'kanigakoi',
  title: 'カニ囲い',
  category: '囲い',
  summary:
    '金2枚と玉が横に並ぶ、相居飛車の仮の宿。カニのように横歩きで完成し、ここから矢倉へ発展するのが王道。',
  steps: frames(initialPosition(), '矢倉に組む途中の中継地点として、まずはカニ囲いで一安心。', [
    [[6, 9], [7, 8], '▲7八金。'],
    [[5, 9], [6, 9], '▲6九玉。玉が一つ横へ。'],
    [
      [4, 9],
      [5, 8],
      '▲5八金でカニ囲いの完成。金・玉・金が横に並ぶ姿がカニの目のよう。上からの攻めに意外と強く、急戦矢倉のお供にも。ここから▲6七金〜▲8八玉と組み替えれば金矢倉(矢倉レッスン参照)に発展します。',
    ],
  ]),
};

const funagakoi: Lesson = {
  id: 'funagakoi',
  title: '舟囲い',
  category: '囲い',
  summary:
    '相手が振り飛車のときの最速の囲い。わずか3手で完成し、ここから急戦を仕掛けるもよし、穴熊に発展するもよし。',
  steps: frames(
    initialPosition(),
    '相手が振り飛車のとき、居飛車側の玉はまず左へ。手数をかけない「舟囲い」から始めます。',
    [
      [[7, 7], [7, 6], '▲7六歩。角道を開けておきます。'],
      [[5, 9], [6, 8], '▲6八玉。'],
      [[6, 8], [7, 8], '▲7八玉。角の隣に玉が座ったこの形、横から見ると舟のよう。'],
      [
        [4, 9],
        [5, 8],
        '▲5八金右で舟囲いの完成。簡素ですが振り飛車の攻めは横から来るのでこれで十分戦えます。ここから▲5七銀左の急戦へ行くもよし、じっくり穴熊(囲いレッスン参照)に潜るもよし——対振り飛車の万能基地です。',
      ],
    ],
  ),
};

const tenshukaku: Lesson = {
  id: 'tenshukaku',
  title: '天守閣美濃（左美濃）',
  category: '囲い',
  summary:
    '玉が8七——角の上に登る、見た目もユニークな対振り飛車の囲い。飛車の横利きが届かない高台から戦況を見下ろす。',
  steps: frames(
    initialPosition(),
    '振り飛車の攻めは横から来る。「なら玉が上に登れば当たらない」という発想の囲いです。',
    [
      [[5, 9], [6, 8], '▲6八玉。'],
      [[6, 8], [7, 8], '▲7八玉。ここまでは舟囲いと同じですが——'],
      [[8, 7], [8, 6], '▲8六歩。天守閣への階段を作ります。'],
      [
        [7, 8],
        [8, 7],
        '▲8七玉！ 角の真上に王様が登城。この形が「天守閣美濃」です。振り飛車の飛車が成り込んでも、横利きは1〜2段目。7段目の玉には届きません。',
      ],
      [[7, 9], [7, 8], '▲7八銀。土台を固めて…'],
      [
        [4, 9],
        [5, 8],
        '▲5八金で完成。対局中に組むとエフェクトが出ます🦊 弱点は玉のコビン(7五からの斜めライン)。△7四歩〜△7五歩と突かれる前に反撃しましょう。',
      ],
    ],
  ),
};

const diamondMino: Lesson = {
  id: 'diamond-mino',
  title: 'ダイヤモンド美濃',
  category: '囲い',
  summary:
    '美濃囲いに左の銀まで参加させた最強形態。金銀4枚がダイヤ型に連結し、どの駒を取られても即座に取り返せる。',
  steps: (() => {
    // 美濃囲いの完成形から始める
    let start = initialPosition();
    start = relocate(start, [2, 8], [6, 8]); // 飛
    start = relocate(start, [5, 9], [2, 8]); // 玉
    start = relocate(start, [3, 9], [3, 8]); // 銀
    start = relocate(start, [6, 9], [5, 8]); // 金
    return frames(start, '美濃囲いの完成形から。今回は反対側にいる左の銀を呼び寄せます。', [
      [[6, 7], [6, 6], '▲6六歩。角道を止める、振り飛車のいつもの一手。'],
      [[7, 9], [7, 8], '▲7八銀。左銀の長い旅が始まります。'],
      [[7, 8], [6, 7], '▲6七銀。'],
      [[4, 7], [4, 6], '▲4六歩。銀の入るスペースを作って…'],
      [[6, 7], [5, 6], '▲5六銀。'],
      [
        [5, 6],
        [4, 7],
        '▲4七銀！ 金銀4枚がダイヤモンドの形に輝く「ダイヤモンド美濃」の完成です。全部の駒が互いに紐つき、どこを取られても取り返せる究極の連結。対局中に組むとエフェクトが出ます🦊',
      ],
    ]);
  })(),
};

export const LESSONS: Lesson[] = [
  fundoshi,
  wariuchi,
  dengaku,
  tarefu,
  tsugifu,
  jujiBisha,
  hashizeme,
  keiTakatobi,
  kinzoko,
  atamakin,
  haragin,
  chudangyoku,
  hisshi,
  minoKuzushi,
  yaguraKuzushi,
  anagumaKuzushi,
  bogin,
  hayakuri,
  koshikake,
  kakugawari,
  aigakari,
  yokofudori,
  migiShiken,
  shiken,
  sanken,
  nakabisha,
  mukai,
  ishida,
  hayaIshida,
  kakukoukan,
  yagura,
  mino,
  takamino,
  ginkanmuri,
  anaguma,
  funagakoi,
  kanigakoi,
  tenshukaku,
  diamondMino,
];
