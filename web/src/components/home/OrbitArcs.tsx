import type { FC } from 'react';

const CX = 1793;
const CY = 1515;
const P = (r: number, a: number): [number, number] => {
  const t = (a * Math.PI) / 180;
  return [CX + r * Math.cos(t), CY + r * Math.sin(t)];
};

interface CometProps {
  r: number;
  len: number;
  start: number;
  dur: number;
  rev: boolean;
}

const Comet: FC<CometProps> = ({ r, len, start, dur, rev }) => {
  const n = 16;
  const parts = Array.from({ length: n }, (_, i) => {
    const a0 = (i * len) / n;
    const a1 = ((i + 1) * len) / n;
    const t = rev ? (n - i) / n : (i + 1) / n;
    const [x0, y0] = P(r, a0);
    const [x1, y1] = P(r, a1);
    return (
      <path
        key={i}
        d={`M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`}
        stroke="#5b6cf5"
        strokeOpacity={Math.pow(t, 1.6)}
        strokeWidth={0.5 + 1.7 * t}
        strokeLinecap="round"
      />
    );
  });
  const [hx, hy] = P(r, rev ? 0 : len);

  return (
    <g
      style={{
        transformOrigin: `${CX}px ${CY}px`,
        animation: `${rev ? 'jj-spin-rev' : 'jj-spin'} ${dur}s linear infinite`,
      }}
    >
      <g style={{ transformOrigin: `${CX}px ${CY}px`, transform: `rotate(${start}deg)` }}>
        {parts}
        <g style={{ animation: 'jj-twinkle 1.6s ease-in-out infinite' }}>
          <circle cx={hx} cy={hy} r={9} fill="url(#jjHalo)" />
          <path
            d={`M${hx - 7} ${hy} L${hx + 7} ${hy} M${hx} ${hy - 7} L${hx} ${hy + 7}`}
            stroke="#8d9bff"
            strokeWidth={0.8}
            strokeLinecap="round"
          />
          <path
            d={`M${hx - 3} ${hy - 3} L${hx + 3} ${hy + 3} M${hx - 3} ${hy + 3} L${hx + 3} ${hy - 3}`}
            stroke="#b7c0ff"
            strokeWidth={0.6}
            strokeLinecap="round"
          />
          <circle cx={hx} cy={hy} r={2} fill="#fff" stroke="#5b6cf5" strokeWidth={1} />
        </g>
      </g>
    </g>
  );
};

export const OrbitArcs: FC = () => (
  <svg
    width={3586}
    height={3180}
    viewBox="0 0 3586 3180"
    fill="none"
    style={{ position: 'absolute', left: -1200, top: -1200, pointerEvents: 'none' }}
  >
    <defs>
      <radialGradient id="jjHalo">
        <stop offset="0%" stopColor="#8fa0ff" stopOpacity={0.85} />
        <stop offset="100%" stopColor="#5b6cf5" stopOpacity={0} />
      </radialGradient>
    </defs>
    <Comet r={290} len={24} start={190} dur={22} rev={false} />
    <Comet r={364} len={20} start={20} dur={30} rev />
    <Comet r={438} len={16} start={80} dur={34} rev />
    <Comet r={508} len={18} start={160} dur={40} rev={false} />
    <Comet r={508} len={9} start={345} dur={40} rev={false} />
    <Comet r={588} len={12} start={250} dur={48} rev />
    <Comet r={668} len={10} start={300} dur={56} rev={false} />
  </svg>
);
