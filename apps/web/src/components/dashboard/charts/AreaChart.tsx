'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface DataPoint {
  label: string;
  value: number;
}

interface AreaChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  fillColor?: string;
  showGrid?: boolean;
  showLabels?: boolean;
  showTooltip?: boolean;
  formatValue?: (value: number) => string;
  className?: string;
}

export default function AreaChart({
  data,
  height = 200,
  color = '#22d3ee', // cyan-400
  fillColor = 'rgba(34, 211, 238, 0.1)',
  showGrid = true,
  showLabels = true,
  formatValue = (v) => v.toString(),
  className = '',
}: AreaChartProps) {
  const { path, areaPath, points, maxValue, minValue } = useMemo(() => {
    if (data.length === 0) return { path: '', areaPath: '', points: [], maxValue: 0, minValue: 0 };

    const values = data.map((d) => d.value);
    const max = Math.max(...values) * 1.1 || 100;
    const min = Math.min(0, Math.min(...values));

    const width = 100;
    const chartHeight = 100;

    const pts = data.map((d, i) => {
      const x = (i / (data.length - 1 || 1)) * width;
      const y = chartHeight - ((d.value - min) / (max - min)) * chartHeight;
      return { x, y, value: d.value, label: d.label };
    });

    // Create smooth curve path
    let pathD = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const midX = (prev.x + curr.x) / 2;
      pathD += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    // Area path (line + bottom)
    const areaD = pathD + ` L ${pts[pts.length - 1].x} ${chartHeight} L ${pts[0].x} ${chartHeight} Z`;

    return { path: pathD, areaPath: areaD, points: pts, maxValue: max, minValue: min };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <span className="text-zinc-600 text-sm">No data available</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
      >
        {/* Grid lines */}
        {showGrid && (
          <g className="text-zinc-900">
            {[0, 25, 50, 75, 100].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="currentColor"
                strokeWidth="0.3"
              />
            ))}
          </g>
        )}

        {/* Area fill */}
        <motion.path
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          d={areaPath}
          fill={fillColor}
        />

        {/* Line */}
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((point, i) => (
          <motion.circle
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 + i * 0.02 }}
            cx={point.x}
            cy={point.y}
            r="1.2"
            fill={color}
            className="cursor-pointer hover:r-[2]"
          />
        ))}
      </svg>

      {/* Y-axis labels */}
      {showLabels && (
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-zinc-600 font-mono -translate-x-full pr-2">
          <span>{formatValue(maxValue)}</span>
          <span>{formatValue(maxValue / 2)}</span>
          <span>{formatValue(0)}</span>
        </div>
      )}

      {/* X-axis labels */}
      {showLabels && data.length > 0 && (
        <div className="flex justify-between mt-2 text-[10px] text-zinc-600 font-mono">
          <span>{data[0].label}</span>
          {data.length > 2 && <span>{data[Math.floor(data.length / 2)].label}</span>}
          <span>{data[data.length - 1].label}</span>
        </div>
      )}
    </div>
  );
}
