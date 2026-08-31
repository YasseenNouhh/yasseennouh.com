/**
 * Fixed scenery behind the app: sky, sun, drifting clouds and a pixel garden
 * strip along the bottom. Everything is drawn with rects so it stays crisp at
 * any zoom and costs no image requests.
 */

const CLOUDS = [
  { top: "12%", w: 92, h: 22, dur: 78, delay: 0 },
  { top: "22%", w: 132, h: 26, dur: 108, delay: -30 },
  { top: "34%", w: 74, h: 18, dur: 92, delay: -62 },
];

export function Garden() {
  return (
    <div className="garden" aria-hidden="true">
      <div className="sun" />

      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="cloud"
          style={{
            top: c.top,
            width: c.w,
            height: c.h,
            animationDuration: `${c.dur}s`,
            animationDelay: `${c.delay}s`,
          }}
        />
      ))}

      <svg viewBox="0 0 320 90" preserveAspectRatio="none" style={{ height: "26vh" }}>
        {/* rolling hills */}
        <path d="M0 34h40v-6h48v6h56v-8h60v8h52v-5h64v66H0z" fill="#a5c46b" />
        <path d="M0 46h72v-4h68v4h58v-6h58v6h64v50H0z" fill="#7a9a4e" />
        <rect x="0" y="62" width="320" height="28" fill="#4c6b32" />
        <rect x="0" y="78" width="320" height="12" fill="#6b4a2c" />
      </svg>

      <svg viewBox="0 0 320 60" preserveAspectRatio="xMidYMax slice" style={{ height: "13vh" }}>
        {/* picket fence */}
        {Array.from({ length: 22 }, (_, i) => (
          <g key={i} transform={`translate(${i * 15}, 0)`}>
            <rect x="2" y="14" width="8" height="46" fill="#b3835a" />
            <rect x="2" y="14" width="3" height="46" fill="#c9a077" />
            <rect x="2" y="10" width="8" height="4" fill="#8b5e3c" />
            <rect x="5" y="6" width="2" height="4" fill="#8b5e3c" />
          </g>
        ))}
        <rect x="0" y="24" width="320" height="6" fill="#8b5e3c" />
        <rect x="0" y="42" width="320" height="6" fill="#8b5e3c" />

        {/* vegetables and flowers poking through */}
        {[14, 58, 103, 149, 196, 241, 287].map((x, i) => (
          <g key={x} transform={`translate(${x}, 30)`}>
            {i % 3 === 0 ? (
              <>
                <rect x="4" y="10" width="4" height="14" fill="#4c6b32" />
                <rect x="0" y="4" width="12" height="8" fill="#c4614f" />
                <rect x="2" y="2" width="8" height="4" fill="#e8875f" />
              </>
            ) : i % 3 === 1 ? (
              <>
                <rect x="5" y="8" width="3" height="18" fill="#4c6b32" />
                <rect x="0" y="2" width="4" height="4" fill="#e8b04b" />
                <rect x="9" y="2" width="4" height="4" fill="#e8b04b" />
                <rect x="4" y="0" width="5" height="8" fill="#f2d06b" />
                <rect x="4" y="8" width="5" height="4" fill="#e8b04b" />
              </>
            ) : (
              <>
                <rect x="2" y="6" width="10" height="8" fill="#7a9a4e" />
                <rect x="0" y="10" width="14" height="8" fill="#4c6b32" />
                <rect x="5" y="18" width="4" height="8" fill="#6b4a2c" />
              </>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
