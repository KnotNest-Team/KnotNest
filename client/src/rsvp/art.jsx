/**
 * Original illustrations for the themed invitations (drawn for KnotNest, no third-party artwork).
 * Every piece takes colours as props so one drawing can serve several themes.
 */

/* ---------------- Royal elephant (faces right) ---------------- */
export function Elephant({ body = '#cbb497', shade = '#a8906f', cloth = '#c0392b', gold = '#e2c27d', ivory = '#fff8ea', eye = '#3a2416', className = '' }) {
  const scallops = Array.from({ length: 10 }, (_, i) => 72 + i * 8);
  return (
    <svg viewBox="0 0 250 200" className={className} aria-hidden="true">
      {/* legs (far side darker) */}
      <rect x="62" y="118" width="20" height="62" rx="8" fill={shade} />
      <rect x="140" y="118" width="20" height="62" rx="8" fill={shade} />
      <rect x="44" y="120" width="22" height="62" rx="9" fill={body} />
      <rect x="122" y="120" width="22" height="62" rx="9" fill={body} />
      {[44, 122].map((x) => <g key={x}><rect x={x - 1} y="164" width="24" height="5" rx="2" fill={gold} /><circle cx={x + 5} cy="172" r="1.8" fill={gold} /><circle cx={x + 11} cy="172" r="1.8" fill={gold} /><circle cx={x + 17} cy="172" r="1.8" fill={gold} /></g>)}
      {/* tail */}
      <path d="M34 92 C22 104 22 124 28 138" stroke={body} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M24 134 l4 12 l5 -11 z" fill={gold} />
      {/* body */}
      <path d="M32 112 C26 74 56 48 102 46 C140 44 164 56 172 80 L174 120 C150 142 66 146 32 112 Z" fill={body} />
      {/* saddle cloth (jhool) with scalloped hem */}
      <path d={`M66 52 C96 44 134 44 154 58 L152 112 ${scallops.slice().reverse().map((x) => `Q${x + 4} 124 ${x} 112`).join(' ')} Z`} fill={cloth} stroke={gold} strokeWidth="2.5" />
      <path d="M74 64 C98 58 128 58 144 66" stroke={gold} strokeWidth="2" fill="none" strokeDasharray="1 5" strokeLinecap="round" />
      {[[92, 82], [112, 80], [132, 84], [102, 98], [122, 98]].map(([x, y]) => <g key={`${x}${y}`}><circle cx={x} cy={y} r="4.5" fill="none" stroke={gold} strokeWidth="1.6" /><circle cx={x} cy={y} r="1.6" fill={gold} /></g>)}
      {scallops.map((x) => <circle key={x} cx={x + 4} cy="121" r="2" fill={gold} />)}
      {/* howdah canopy */}
      <path d="M86 48 C92 22 128 22 134 48 Z" fill={gold} opacity="0.95" />
      <path d="M110 18 v-8" stroke={gold} strokeWidth="2.5" strokeLinecap="round" /><circle cx="110" cy="8" r="3.5" fill={gold} />
      <path d="M90 46 C96 30 124 30 130 46" stroke={cloth} strokeWidth="2" fill="none" />
      {/* head */}
      <path d="M158 58 C172 36 206 38 218 62 C226 82 218 104 202 112 L176 118 C164 104 158 84 158 58 Z" fill={body} />
      {/* ear */}
      <path d="M170 64 C150 66 144 100 160 114 C174 110 180 84 170 64 Z" fill={shade} />
      <path d="M166 74 C158 82 158 98 162 106" stroke={gold} strokeWidth="1.5" fill="none" opacity="0.7" />
      {/* forehead ornament */}
      <path d="M176 50 L194 40 L212 52 L200 72 L186 72 Z" fill={gold} />
      <path d="M186 72 l-4 14 M193 73 l0 16 M200 72 l4 14" stroke={gold} strokeWidth="2" strokeLinecap="round" />
      <circle cx="194" cy="56" r="4" fill={cloth} />
      {/* eye, tusk */}
      <path d="M200 78 q5 -4 9 0" stroke={eye} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M150 96 C154 104 154 112 150 118" stroke={shade} strokeWidth="1.5" fill="none" />
      <path d="M198 108 C206 118 218 118 226 110" stroke={ivory} strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* raised trunk, a sign of good fortune */}
      <path d="M214 98 C232 96 242 78 238 58 C235 44 222 42 220 52" stroke={body} strokeWidth="14" fill="none" strokeLinecap="round" />
      <path d="M226 90 l8 -3 M231 78 l8 -1 M233 66 l7 2" stroke={gold} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------- Peacock (faces right, tail trailing left) ---------------- */
export function Peacock({ body = '#13527a', neck = '#1a7f8e', tail = '#1f6f5c', eye = '#0e3d6b', gold = '#d4a72c', className = '' }) {
  const feathers = [[22, 212], [8, 186], [6, 156], [16, 128], [36, 104], [62, 88], [92, 80]];
  return (
    <svg viewBox="0 0 260 230" className={className} aria-hidden="true">
      {/* tail feathers */}
      {feathers.map(([x, y], i) => (
        <g key={i} className="kn-shimmer" style={{ animationDelay: `${i * 0.35}s` }}>
          <path d={`M162 150 Q${(x + 162) / 2 + 10} ${(y + 150) / 2 + 22} ${x + 10} ${y}`} stroke={tail} strokeWidth="2.5" fill="none" />
          <path d={`M162 150 Q${(x + 162) / 2 + 10} ${(y + 150) / 2 + 22} ${x + 10} ${y}`} stroke={gold} strokeWidth="9" fill="none" strokeDasharray="1 6" opacity="0.45" />
          <ellipse cx={x + 10} cy={y} rx="15" ry="11" fill={tail} transform={`rotate(${-30 + i * 10} ${x + 10} ${y})`} />
          <ellipse cx={x + 10} cy={y} rx="11" ry="8" fill={gold} transform={`rotate(${-30 + i * 10} ${x + 10} ${y})`} />
          <ellipse cx={x + 10} cy={y} rx="7" ry="5.5" fill={neck} transform={`rotate(${-30 + i * 10} ${x + 10} ${y})`} />
          <ellipse cx={x + 10} cy={y} rx="3.6" ry="3" fill={eye} transform={`rotate(${-30 + i * 10} ${x + 10} ${y})`} />
        </g>
      ))}
      {/* legs */}
      <path d="M176 176 l-4 30 m4 -30 l6 30 M170 206 h10 m-2 0 h10" stroke={gold} strokeWidth="3" strokeLinecap="round" />
      {/* body and neck */}
      <path d="M150 150 C150 120 170 104 190 108 C202 112 206 128 200 150 C194 172 170 180 158 172 C152 166 150 158 150 150 Z" fill={body} />
      <path d="M186 112 C184 86 186 62 198 46 C206 36 218 40 216 52 C212 70 200 86 198 112 Z" fill={neck} />
      {/* wing */}
      <path d="M160 140 C170 124 188 122 194 132 C188 150 172 162 158 160 Z" fill={tail} />
      <path d="M166 146 q10 -10 22 -12 M168 152 q10 -8 20 -10" stroke={gold} strokeWidth="1.4" fill="none" opacity="0.8" />
      {/* head, beak, eye stripe, crest */}
      <circle cx="209" cy="46" r="10" fill={neck} />
      <path d="M218 44 l12 4 l-12 4 z" fill={gold} />
      <path d="M204 42 q6 -3 12 1" stroke="#fff" strokeWidth="2" fill="none" />
      <circle cx="211" cy="44" r="1.6" fill="#111" />
      {[[-12, -24], [-4, -28], [4, -26]].map(([dx, dy], i) => <g key={i}><path d={`M208 36 l${dx} ${dy}`} stroke={neck} strokeWidth="1.6" /><circle cx={208 + dx} cy={36 + dy} r="3" fill={gold} /></g>)}
    </svg>
  );
}

/* ---------------- Mughal / Rajput arch frame ---------------- */
export function ArchFrame({ stroke = '#d9b46a', fill = 'rgba(255,255,255,0.04)', className = '' }) {
  return (
    <svg viewBox="0 0 400 520" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path d="M14 520 V210 C14 128 110 70 200 22 C290 70 386 128 386 210 V520" fill={fill} stroke={stroke} strokeWidth="2.5" />
      <path d="M32 520 V214 C32 142 118 90 200 46 C282 90 368 142 368 214 V520" fill="none" stroke={stroke} strokeWidth="1.2" strokeDasharray="2 6" />
      <path d="M200 22 V4" stroke={stroke} strokeWidth="2" /><circle cx="200" cy="4" r="3.5" fill={stroke} />
      {[14, 386].map((x) => <g key={x}><rect x={x - 9} y="300" width="18" height="12" fill={stroke} opacity="0.8" /><rect x={x - 6} y="312" width="12" height="208" fill="none" stroke={stroke} strokeWidth="1" opacity="0.6" /></g>)}
    </svg>
  );
}

/* ---------------- Marigold toran (garland) with mango leaves ---------------- */
export function Toran({ flower = '#f39c12', flower2 = '#f7c948', leaf = '#2e7d32', string = '#7a4a1a', count = 18, className = '' }) {
  const W = 1200; const step = W / count;
  const y = (x) => 22 + 14 * Math.sin((x / W) * Math.PI);
  return (
    <svg viewBox={`0 0 ${W} 110`} preserveAspectRatio="none" className={className} aria-hidden="true">
      <path d={`M0 22 Q${W / 2} 50 ${W} 22`} stroke={string} strokeWidth="2" fill="none" />
      {Array.from({ length: count + 1 }, (_, i) => {
        const x = i * step; const cy = y(x);
        return (
          <g key={i}>
            {i < count && <g className="kn-sway" style={{ transformOrigin: `${x + step / 2}px ${y(x + step / 2)}px`, animationDelay: `${(i % 5) * 0.4}s` }}>
              <path d={`M${x + step / 2} ${y(x + step / 2)} C${x + step / 2 - 9} ${y(x + step / 2) + 22} ${x + step / 2 - 5} ${y(x + step / 2) + 46} ${x + step / 2} ${y(x + step / 2) + 58} C${x + step / 2 + 5} ${y(x + step / 2) + 46} ${x + step / 2 + 9} ${y(x + step / 2) + 22} ${x + step / 2} ${y(x + step / 2)} Z`} fill={leaf} />
              <path d={`M${x + step / 2} ${y(x + step / 2) + 4} V${y(x + step / 2) + 54}`} stroke="#ffffff55" strokeWidth="1" />
            </g>}
            <circle cx={x} cy={cy} r="11" fill={i % 2 ? flower2 : flower} />
            <circle cx={x} cy={cy} r="11" fill="none" stroke="#00000022" strokeDasharray="2 2.4" strokeWidth="5" />
            <circle cx={x} cy={cy} r="3.5" fill={i % 2 ? flower : '#c0600a'} />
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------- Hanging lanterns ---------------- */
export function Lanterns({ metal = '#c9a646', glow = '#ffd98a', count = 7, className = '' }) {
  return (
    <svg viewBox="0 0 1200 170" preserveAspectRatio="xMidYMin slice" className={className} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const x = 90 + i * (1020 / (count - 1)); const len = 40 + ((i * 37) % 60);
        return (
          <g key={i} className="kn-sway" style={{ transformOrigin: `${x}px 0px`, animationDelay: `${i * 0.5}s` }}>
            <path d={`M${x} 0 V${len}`} stroke={metal} strokeWidth="1.5" />
            <circle cx={x} cy={len + 42} r="26" fill={glow} opacity="0.25" className="kn-flicker" />
            <path d={`M${x - 10} ${len + 8} L${x} ${len} L${x + 10} ${len + 8} Z`} fill={metal} />
            <path d={`M${x - 16} ${len + 16} C${x - 16} ${len + 8} ${x + 16} ${len + 8} ${x + 16} ${len + 16} L${x + 12} ${len + 62} H${x - 12} Z`} fill={metal} opacity="0.95" />
            <path d={`M${x - 8} ${len + 20} C${x - 8} ${len + 14} ${x + 8} ${len + 14} ${x + 8} ${len + 20} V${len + 54} H${x - 8} Z`} fill={glow} className="kn-flicker" />
            <path d={`M${x} ${len + 16} V${len + 60} M${x - 8} ${len + 34} H${x + 8}`} stroke={metal} strokeWidth="1.2" />
            <path d={`M${x - 6} ${len + 62} L${x} ${len + 74} L${x + 6} ${len + 62}`} fill={metal} />
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------- Clay diya with a flickering flame ---------------- */
export function Diya({ clay = '#b5562b', rim = '#d9b46a', className = '' }) {
  return (
    <svg viewBox="0 0 90 80" className={className} aria-hidden="true">
      <ellipse cx="45" cy="44" rx="18" ry="18" fill="#ffcf6b" opacity="0.25" className="kn-flicker" />
      <path className="kn-flicker" d="M45 18 C52 30 54 40 45 50 C36 40 38 30 45 18 Z" fill="#ffb43b" />
      <path className="kn-flicker" style={{ animationDelay: '.2s' }} d="M45 30 C49 37 49 43 45 48 C41 43 41 37 45 30 Z" fill="#fff3c4" />
      <path d="M8 54 C14 74 76 74 82 54 C70 58 20 58 8 54 Z" fill={clay} />
      <path d="M8 54 C20 58 70 58 82 54" stroke={rim} strokeWidth="2.5" fill="none" />
      <path d="M78 52 l10 -4 l-4 8 z" fill={clay} />
      {[24, 36, 48, 60].map((x) => <circle key={x} cx={x + 3} cy="64" r="1.8" fill={rim} />)}
    </svg>
  );
}

/* ---------------- Banana leaf ---------------- */
export function BananaLeaf({ leaf = '#2f7d32', vein = '#a5d6a7', className = '' }) {
  return (
    <svg viewBox="0 0 120 320" className={className} aria-hidden="true">
      <path d="M60 318 C58 250 10 210 14 120 C18 50 46 10 62 2 C76 20 106 60 104 140 C102 220 64 250 60 318 Z" fill={leaf} />
      <path d="M60 316 C62 220 62 100 62 4" stroke={vein} strokeWidth="2.5" fill="none" />
      {Array.from({ length: 14 }, (_, i) => <path key={i} d={`M61 ${40 + i * 18} C${48 - (i % 3) * 3} ${36 + i * 18} ${30} ${44 + i * 18} ${20 + (i > 10 ? 10 : 0)} ${50 + i * 18} M62 ${40 + i * 18} C${76} ${36 + i * 18} ${92} ${44 + i * 18} ${100 - (i > 10 ? 10 : 0)} ${52 + i * 18}`} stroke={vein} strokeWidth="1" fill="none" opacity="0.55" />)}
    </svg>
  );
}

/* ---------------- Crossed dandiya sticks with tassels ---------------- */
export function Dandiya({ stick = '#c0392b', band = '#f2b705', mirror = '#e8f4ff', tassel = '#1e7b3c', className = '' }) {
  const Stick = ({ rot }) => (
    <g transform={`rotate(${rot} 80 80)`}>
      <rect x="74" y="6" width="12" height="148" rx="6" fill={stick} />
      {[22, 46, 70, 94, 118].map((y) => <rect key={y} x="74" y={y} width="12" height="6" fill={band} />)}
      {[34, 58, 82, 106].map((y) => <circle key={y} cx="80" cy={y + 2} r="2.4" fill={mirror} />)}
      <path d="M80 154 l-6 18 M80 154 l0 20 M80 154 l6 18" stroke={tassel} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
  return <svg viewBox="0 0 160 180" className={className} aria-hidden="true"><Stick rot={-28} /><Stick rot={28} /></svg>;
}

/* ---------------- Dhol drum ---------------- */
export function Dhol({ shell = '#8e1b3a', head = '#f5e6c8', rope = '#f6a623', className = '' }) {
  return (
    <svg viewBox="0 0 200 130" className={className} aria-hidden="true">
      <path d="M30 30 H170 V100 H30 Z" fill={shell} />
      <ellipse cx="30" cy="65" rx="16" ry="36" fill={head} stroke={rope} strokeWidth="3" />
      <ellipse cx="170" cy="65" rx="16" ry="36" fill={head} stroke={rope} strokeWidth="3" />
      <path d={Array.from({ length: 8 }, (_, i) => `M${40 + i * 17} 32 L${48 + i * 17} 98`).join(' ') + Array.from({ length: 8 }, (_, i) => ` M${56 + i * 17} 32 L${48 + i * 17} 98`).join('')} stroke={rope} strokeWidth="2" />
      <path d="M60 20 L120 4 M140 20 L178 2" stroke="#7a4a1a" strokeWidth="5" strokeLinecap="round" />
      <path d="M30 30 H170 M30 100 H170" stroke="#00000033" strokeWidth="2" />
    </svg>
  );
}

/* ---------------- Conch shell (shankha) ---------------- */
export function Shankha({ shell = '#fbf3ea', line = '#b71c1c', className = '' }) {
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden="true">
      <path d="M12 70 C20 30 70 14 110 26 C140 36 154 58 146 76 C132 100 90 108 60 100 C40 96 18 90 12 70 Z" fill={shell} stroke={line} strokeWidth="3" />
      <path d="M110 26 C120 46 118 70 104 90 M84 22 C96 44 92 74 78 98 M58 28 C68 48 64 76 52 96" stroke={line} strokeWidth="2" fill="none" opacity="0.7" />
      <path d="M146 76 C150 84 152 92 144 98" stroke={line} strokeWidth="3" fill="none" />
      <path d="M12 70 C6 72 2 76 4 82" stroke={line} strokeWidth="3" fill="none" />
    </svg>
  );
}

/* ---------------- Lotus ---------------- */
export function Lotus({ petal = '#e8467c', inner = '#f7a8c4', leaf = '#2e7d32', className = '' }) {
  return (
    <svg viewBox="0 0 160 110" className={className} aria-hidden="true">
      <path d="M10 96 C40 84 120 84 150 96 C120 108 40 108 10 96 Z" fill={leaf} />
      {[-60, -32, 32, 60].map((r) => <path key={r} d="M80 90 C70 70 70 46 80 30 C90 46 90 70 80 90 Z" fill={petal} opacity="0.85" transform={`rotate(${r} 80 90)`} />)}
      <path d="M80 92 C64 70 66 38 80 14 C94 38 96 70 80 92 Z" fill={inner} stroke={petal} strokeWidth="2" />
    </svg>
  );
}

/* ---------------- Pair of doves ---------------- */
export function Dove({ body = '#ffffff', line = '#b9a07a', className = '' }) {
  return (
    <svg viewBox="0 0 160 110" className={className} aria-hidden="true">
      <path d="M20 70 C40 54 70 56 96 64 C110 50 124 46 136 52 C128 56 124 60 122 66 C112 86 80 94 52 88 C40 86 28 80 20 70 Z" fill={body} stroke={line} strokeWidth="2" />
      <path d="M60 64 C64 30 90 10 118 6 C110 26 104 46 92 62 Z" fill={body} stroke={line} strokeWidth="2" />
      <path d="M70 58 C76 40 92 26 108 20 M78 60 C84 46 96 36 106 32" stroke={line} strokeWidth="1.2" fill="none" />
      <path d="M136 52 l10 -2 l-8 6 z" fill="#d9a441" /><circle cx="130" cy="55" r="1.8" fill="#333" />
      <path d="M20 70 L4 62 L8 74 L2 82 L22 76" fill={body} stroke={line} strokeWidth="2" />
    </svg>
  );
}

/* ---------------- Wedding bells with a bow ---------------- */
export function Bells({ metal = '#c9a646', bow = '#d9a5a0', className = '' }) {
  const Bell = ({ x, r }) => (
    <g transform={`rotate(${r} ${x} 30)`}>
      <path d={`M${x - 26} 92 C${x - 26} 60 ${x - 20} 34 ${x} 34 C${x + 20} 34 ${x + 26} 60 ${x + 26} 92 Z`} fill={metal} />
      <rect x={x - 30} y="90" width="60" height="7" rx="3" fill={metal} /><circle cx={x} cy="104" r="6" fill={metal} />
      <path d={`M${x - 12} 50 C${x - 14} 62 ${x - 14} 76 ${x - 12} 86`} stroke="#ffffff88" strokeWidth="3" fill="none" />
    </g>
  );
  return (
    <svg viewBox="0 0 200 120" className={className} aria-hidden="true">
      <g className="kn-sway" style={{ transformOrigin: '100px 20px' }}><Bell x={74} r={10} /><Bell x={126} r={-10} /></g>
      <path d="M100 26 C80 6 66 12 72 26 C78 36 92 30 100 26 C108 30 122 36 128 26 C134 12 120 6 100 26 Z" fill={bow} />
      <path d="M96 28 L84 50 M104 28 L116 50" stroke={bow} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------- Botanical branch (line art) ---------------- */
export function Branch({ stem = '#5b6b55', leaf = '#9fb39a', className = '' }) {
  const leaves = [[30, 120, -40], [52, 98, 30], [70, 84, -30], [92, 70, 34], [112, 58, -26], [134, 46, 30], [154, 36, -20]];
  return (
    <svg viewBox="0 0 200 150" className={className} aria-hidden="true">
      <path d="M10 140 C60 110 120 60 190 26" stroke={stem} strokeWidth="2.2" fill="none" />
      {leaves.map(([x, y, r], i) => <ellipse key={i} cx={x} cy={y} rx="14" ry="7" fill={leaf} opacity="0.85" transform={`rotate(${r} ${x} ${y})`} />)}
    </svg>
  );
}

/* ---------------- Radial mandala / rangoli ---------------- */
export function Mandala({ a = '#d9b46a', b = '#c0392b', c = '#ffffff', className = '' }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => <path key={`p${i}`} d="M100 100 C92 76 92 50 100 26 C108 50 108 76 100 100 Z" fill={i % 2 ? a : b} opacity="0.9" transform={`rotate(${i * 22.5} 100 100)`} />)}
      {Array.from({ length: 24 }, (_, i) => <circle key={`d${i}`} cx="100" cy="14" r="3" fill={a} transform={`rotate(${i * 15} 100 100)`} />)}
      <circle cx="100" cy="100" r="30" fill={b} /><circle cx="100" cy="100" r="22" fill="none" stroke={a} strokeWidth="2" strokeDasharray="3 4" />
      {Array.from({ length: 8 }, (_, i) => <path key={`s${i}`} d="M100 100 L100 82" stroke={c} strokeWidth="3" strokeLinecap="round" transform={`rotate(${i * 45} 100 100)`} />)}
      <circle cx="100" cy="100" r="7" fill={a} />
    </svg>
  );
}

/* ---------------- Falling petals (decorative) ---------------- */
export function Petals({ colors = ['#f39c12', '#f7c948', '#e8467c'], count = 16 }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <svg key={i} viewBox="0 0 20 24" className="kn-fall absolute" style={{ left: `${(i * 61) % 100}%`, width: 10 + (i % 4) * 4, animationDelay: `${(i * 0.9) % 9}s`, animationDuration: `${9 + (i % 5) * 2}s` }}>
          <path d="M10 0 C18 6 18 16 10 24 C2 16 2 6 10 0 Z" fill={colors[i % colors.length]} opacity="0.85" />
        </svg>
      ))}
    </div>
  );
}

/* ---------------- Background patterns (as CSS url) ---------------- */
const enc = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
export const PATTERNS = {
  paisley: (c) => enc(`<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><path d='M20 44 C6 40 6 20 20 16 C32 13 40 24 34 34 C30 40 24 40 22 36 C20 32 24 28 28 30' fill='none' stroke='${c}' stroke-width='1.3'/><circle cx='48' cy='16' r='1.6' fill='${c}'/><circle cx='52' cy='50' r='1.2' fill='${c}'/></svg>`),
  bandhani: (c) => enc(`<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28'><g fill='${c}'><circle cx='7' cy='5' r='1.4'/><circle cx='4' cy='8' r='1.4'/><circle cx='10' cy='8' r='1.4'/><circle cx='7' cy='11' r='1.4'/><circle cx='21' cy='19' r='1.4'/><circle cx='18' cy='22' r='1.4'/><circle cx='24' cy='22' r='1.4'/><circle cx='21' cy='25' r='1.4'/></g></svg>`),
  kolam: (c) => enc(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><g fill='${c}'><circle cx='10' cy='10' r='1.5'/><circle cx='30' cy='10' r='1.5'/><circle cx='10' cy='30' r='1.5'/><circle cx='30' cy='30' r='1.5'/></g><path d='M20 4 C30 10 30 30 20 36 C10 30 10 10 20 4 Z M4 20 C10 10 30 10 36 20 C30 30 10 30 4 20 Z' fill='none' stroke='${c}' stroke-width='1'/></svg>`),
  phulkari: (c) => enc(`<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36'><path d='M18 4 L32 18 L18 32 L4 18 Z' fill='none' stroke='${c}' stroke-width='1.2'/><path d='M18 11 L25 18 L18 25 L11 18 Z' fill='${c}' opacity='.6'/></svg>`),
  jaali: (c) => enc(`<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44'><g fill='none' stroke='${c}' stroke-width='1'><rect x='13' y='13' width='18' height='18'/><rect x='13' y='13' width='18' height='18' transform='rotate(45 22 22)'/></g><circle cx='22' cy='22' r='2' fill='${c}'/></svg>`),
  alpana: (c) => enc(`<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><path d='M30 10 C40 20 40 40 30 50 C20 40 20 20 30 10 Z M10 30 C20 20 40 20 50 30 C40 40 20 40 10 30 Z' fill='none' stroke='${c}' stroke-width='1.2'/><circle cx='30' cy='30' r='3' fill='${c}'/></svg>`),
  paithani: (c) => enc(`<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><path d='M24 8 C30 16 30 24 24 30 C18 24 18 16 24 8 Z' fill='${c}' opacity='.7'/><path d='M8 40 h32' stroke='${c}' stroke-width='1' stroke-dasharray='2 3'/></svg>`),
  florals: (c) => enc(`<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56'><g fill='${c}'><circle cx='14' cy='14' r='3'/><circle cx='14' cy='8' r='2.4'/><circle cx='20' cy='14' r='2.4'/><circle cx='14' cy='20' r='2.4'/><circle cx='8' cy='14' r='2.4'/><circle cx='42' cy='42' r='1.6'/></g></svg>`),
  dots: (c) => enc(`<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><circle cx='12' cy='12' r='1.2' fill='${c}'/></svg>`),
};
