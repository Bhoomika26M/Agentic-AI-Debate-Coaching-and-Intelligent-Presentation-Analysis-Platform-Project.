import React from 'react';

export const RadarChart = ({ data = [], size = 320 }) => {
  // data: [{ label: string, value: number (0-100) }]
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-xs text-arena-muted">
        No skill records available yet.
      </div>
    );
  }

  const radius = size / 2 - 40;
  const center = size / 2;
  const total = data.length;
  const angleStep = (Math.PI * 2) / total;

  // Compute polygon points for concentric guide rings (25%, 50%, 75%, 100%)
  const rings = [0.25, 0.5, 0.75, 1.0];

  const getCoordinates = (value, index) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = (value / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  const polygonPoints = data
    .map((item, idx) => {
      const { x, y } = getCoordinates(item.value, idx);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background Guide Rings */}
        {rings.map((ring, ringIdx) => {
          const ringPoints = data
            .map((_, idx) => {
              const angle = idx * angleStep - Math.PI / 2;
              const r = ring * radius;
              const x = center + r * Math.cos(angle);
              const y = center + r * Math.sin(angle);
              return `${x},${y}`;
            })
            .join(' ');

          return (
            <polygon
              key={ringIdx}
              points={ringPoints}
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="1"
            />
          );
        })}

        {/* Spoke Axes */}
        {data.map((_, idx) => {
          const angle = idx * angleStep - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          return (
            <line
              key={idx}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="1"
            />
          );
        })}

        {/* Value Area Polygon */}
        <polygon
          points={polygonPoints}
          fill="rgba(245, 158, 11, 0.25)"
          stroke="#F59E0B"
          strokeWidth="2.5"
          className="transition-all duration-300"
        />

        {/* Value Points */}
        {data.map((item, idx) => {
          const { x, y } = getCoordinates(item.value, idx);
          return (
            <g key={idx}>
              <circle
                cx={x}
                cy={y}
                r="4.5"
                fill="#F59E0B"
                stroke="#080B10"
                strokeWidth="2"
              />
            </g>
          );
        })}

        {/* Outer Labels */}
        {data.map((item, idx) => {
          const angle = idx * angleStep - Math.PI / 2;
          const labelRadius = radius + 22;
          const x = center + labelRadius * Math.cos(angle);
          const y = center + labelRadius * Math.sin(angle);
          const anchor =
            Math.cos(angle) > 0.3 ? 'start' : Math.cos(angle) < -0.3 ? 'end' : 'middle';

          return (
            <text
              key={idx}
              x={x}
              y={y + 3}
              textAnchor={anchor}
              className="text-[9px] font-mono fill-arena-muted uppercase tracking-tighter"
            >
              {item.label} ({item.value}%)
            </text>
          );
        })}
      </svg>
    </div>
  );
};
