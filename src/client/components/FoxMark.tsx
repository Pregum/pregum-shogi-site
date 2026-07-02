export function FoxMark({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      className="fox-mark"
    >
      {/* 耳 */}
      <path d="M20 6 L40 28 L14 36 Z" fill="var(--vermilion-deep)" />
      <path d="M80 6 L86 36 L60 28 Z" fill="var(--vermilion-deep)" />
      {/* 顔 */}
      <path d="M50 20 L86 42 L50 94 L14 42 Z" fill="var(--vermilion)" />
      {/* 頬(白) */}
      <path d="M14 42 L50 94 L36 46 Z" fill="var(--cream)" />
      <path d="M86 42 L50 94 L64 46 Z" fill="var(--cream)" />
      {/* 目 */}
      <path d="M33 44 L43 48" stroke="var(--ink-deep)" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M67 44 L57 48" stroke="var(--ink-deep)" strokeWidth="3.4" strokeLinecap="round" />
      {/* 鼻 */}
      <path d="M45 66 L55 66 L50 73 Z" fill="var(--ink-deep)" />
    </svg>
  );
}

export function ToriiMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <path d="M4 18 Q50 8 96 18 L94 30 L6 30 Z" fill="currentColor" />
      <rect x="12" y="42" width="76" height="8" fill="currentColor" />
      <rect x="20" y="30" width="10" height="64" fill="currentColor" />
      <rect x="70" y="30" width="10" height="64" fill="currentColor" />
      <rect x="46" y="30" width="8" height="12" fill="currentColor" />
    </svg>
  );
}
