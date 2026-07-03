import { useEffect, useRef, useState } from 'react';
import type { Color, Position } from '../../shared/shogi';
import { SENTE } from '../../shared/shogi';
import { detectFormations } from '../../shared/formations';
import { playFormation } from '../lib/sound';

interface Banner {
  name: string;
  color: Color;
}

// 局面を監視し、囲いが新しく完成した瞬間にバナーを出すフック。
// resetKey が変わる(再戦・新規対局)と検出履歴をリセットする。
export function useFormationBanner(
  pos: Position | null,
  resetKey: string,
  names: [string, string],
): React.ReactNode {
  const seen = useRef(new Set<string>());
  const initialized = useRef(false);
  const currentKey = useRef(resetKey);
  const [banner, setBanner] = useState<Banner | null>(null);

  if (currentKey.current !== resetKey) {
    currentKey.current = resetKey;
    seen.current = new Set();
    initialized.current = false;
  }

  useEffect(() => {
    if (!pos) return;
    const matched = detectFormations(pos);
    // 初回(リロードで途中参加した場合など)は既存の囲いを黙って記録するだけ
    if (!initialized.current) {
      initialized.current = true;
      for (const m of matched) seen.current.add(`${m.color}-${m.id}`);
      return;
    }
    for (const m of matched) {
      const key = `${m.color}-${m.id}`;
      if (seen.current.has(key)) continue;
      seen.current.add(key);
      setBanner({ name: m.name, color: m.color });
      playFormation();
      const t = setTimeout(() => setBanner(null), 3000);
      return () => clearTimeout(t);
    }
  }, [pos]);

  if (!banner) return null;
  return (
    <div className="formation-banner" aria-live="polite">
      <div className="formation-banner-inner">
        <span className="formation-player">
          {banner.color === SENTE ? '☗' : '☖'} {names[banner.color]}
        </span>
        <span className="formation-name">{banner.name}</span>
        <span className="formation-done">完成！</span>
      </div>
    </div>
  );
}
