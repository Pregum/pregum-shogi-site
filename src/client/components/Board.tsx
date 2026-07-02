import { useMemo, useState } from 'react';
import type { Base, Color, Move, PieceType, Position, Sq } from '../../shared/shogi';
import { GOTE, HAND_ORDER, SENTE, idx, legalMoves } from '../../shared/shogi';
import { PIECE_CHAR } from '../../shared/kif';

type Selection = { kind: 'board'; sq: Sq } | { kind: 'hand'; base: Base } | null;

const FILE_LABELS = ['１', '２', '３', '４', '５', '６', '７', '８', '９'];
const RANK_LABELS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

function pieceChar(type: PieceType, color: Color) {
  return type === 'OU' && color === GOTE ? '玉' : PIECE_CHAR[type];
}

export function Board({
  pos,
  viewpoint,
  interactive,
  lastTo,
  onMove,
}: {
  pos: Position;
  viewpoint: Color;
  interactive: boolean;
  lastTo?: Sq | null;
  onMove?: (move: Move) => void;
}) {
  const [selection, setSelection] = useState<Selection>(null);
  const [promoChoice, setPromoChoice] = useState<{ from: Sq; to: Sq } | null>(null);

  const moves = useMemo(() => (interactive ? legalMoves(pos) : []), [pos, interactive]);

  const candidateMoves = useMemo(() => {
    if (!selection) return [];
    if (selection.kind === 'board') {
      return moves.filter(
        (m) => m.from && m.from.file === selection.sq.file && m.from.rank === selection.sq.rank,
      );
    }
    return moves.filter((m) => m.drop === selection.base);
  }, [selection, moves]);

  const targets = useMemo(() => {
    const set = new Set<number>();
    for (const m of candidateMoves) set.add(idx(m.to.file, m.to.rank));
    return set;
  }, [candidateMoves]);

  const files = viewpoint === SENTE ? [9, 8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const ranks = viewpoint === SENTE ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : [9, 8, 7, 6, 5, 4, 3, 2, 1];

  const play = (move: Move) => {
    setSelection(null);
    setPromoChoice(null);
    onMove?.(move);
  };

  const clickSquare = (file: number, rank: number) => {
    if (!interactive) return;
    const piece = pos.board[idx(file, rank)];

    if (selection && targets.has(idx(file, rank))) {
      const options = candidateMoves.filter((m) => m.to.file === file && m.to.rank === rank);
      if (options.length === 1) {
        play(options[0]);
      } else if (selection.kind === 'board') {
        // 成 / 不成 の両方が可能 → ダイアログで選択
        setPromoChoice({ from: selection.sq, to: { file, rank } });
      }
      return;
    }

    if (piece && piece.color === pos.turn) {
      setSelection({ kind: 'board', sq: { file, rank } });
    } else {
      setSelection(null);
    }
  };

  const clickHand = (base: Base) => {
    if (!interactive) return;
    setSelection((cur) =>
      cur?.kind === 'hand' && cur.base === base ? null : { kind: 'hand', base },
    );
  };

  const myHand = pos.hands[viewpoint];
  const oppColor = (1 - viewpoint) as Color;
  const oppHand = pos.hands[oppColor];

  return (
    <div className="board-wrap">
      <HandRow
        hand={oppHand}
        color={oppColor}
        mine={false}
        selection={null}
        onSelect={() => {}}
      />

      <div className="board-frame">
        <div className="board-grid" role="grid">
          {ranks.map((rank) => (
            <div className="board-row" key={rank} role="row">
              {files.map((file) => {
                const piece = pos.board[idx(file, rank)];
                const isSelected =
                  selection?.kind === 'board' &&
                  selection.sq.file === file &&
                  selection.sq.rank === rank;
                const isTarget = targets.has(idx(file, rank));
                const isLast = lastTo && lastTo.file === file && lastTo.rank === rank;
                const promoted =
                  piece && ['TO', 'NY', 'NK', 'NG', 'UM', 'RY'].includes(piece.type);
                return (
                  <button
                    key={file}
                    role="gridcell"
                    className={[
                      'cell',
                      isSelected ? 'is-selected' : '',
                      isTarget ? 'is-target' : '',
                      isLast ? 'is-last' : '',
                    ].join(' ')}
                    onClick={() => clickSquare(file, rank)}
                    aria-label={`${file}${rank}`}
                  >
                    {piece && (
                      <span
                        className={[
                          'piece',
                          piece.color !== viewpoint ? 'is-enemy' : '',
                          promoted ? 'is-promoted' : '',
                        ].join(' ')}
                      >
                        {pieceChar(piece.type, piece.color)}
                      </span>
                    )}
                    {isTarget && !piece && <span className="target-dot" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {/* 座標ラベル */}
        <div className="file-labels">
          {files.map((f) => (
            <span key={f}>{FILE_LABELS[f - 1]}</span>
          ))}
        </div>
        <div className="rank-labels">
          {ranks.map((r) => (
            <span key={r}>{RANK_LABELS[r - 1]}</span>
          ))}
        </div>
      </div>

      <HandRow
        hand={myHand}
        color={viewpoint}
        mine={interactive}
        selection={selection?.kind === 'hand' ? selection.base : null}
        onSelect={clickHand}
      />

      {promoChoice && (
        <div className="modal-backdrop" onClick={() => setPromoChoice(null)}>
          <div className="modal promo-modal" onClick={(e) => e.stopPropagation()}>
            <p className="modal-title">成りますか？</p>
            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={() => play({ from: promoChoice.from, to: promoChoice.to, promote: true })}
              >
                成る
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => play({ from: promoChoice.from, to: promoChoice.to, promote: false })}
              >
                成らず
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HandRow({
  hand,
  color,
  mine,
  selection,
  onSelect,
}: {
  hand: Record<Base, number>;
  color: Color;
  mine: boolean;
  selection: Base | null;
  onSelect: (base: Base) => void;
}) {
  const pieces = HAND_ORDER.filter((b) => hand[b] > 0);
  return (
    <div className={`hand-row ${mine ? 'is-mine' : ''}`}>
      <span className="hand-label">{color === SENTE ? '☗' : '☖'} 持駒</span>
      {pieces.length === 0 && <span className="hand-empty">なし</span>}
      {pieces.map((b) => (
        <button
          key={b}
          className={`hand-piece ${selection === b ? 'is-selected' : ''}`}
          onClick={() => onSelect(b)}
          disabled={!mine}
        >
          <span className="piece">{PIECE_CHAR[b]}</span>
          {hand[b] > 1 && <span className="hand-count">{hand[b]}</span>}
        </button>
      ))}
    </div>
  );
}
