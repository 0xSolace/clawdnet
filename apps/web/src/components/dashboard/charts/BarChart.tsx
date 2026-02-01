'use client';

import { motion } from 'framer-motion';

interface DataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

interface BarChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  secondaryColor?: string;
  showLabels?: boolean;
  formatValue?: (value: number) => string;
  className?: string;
}

export default function BarChart({
  data,
  height = 200,
  color = '#a855f7', // primary/purple
  secondaryColor = 'rgba(239, 68, 68, 0.5)', // red for errors
  showLabels = true,
  formatValue = (v) => v.toString(),
  className = '',
}: BarChartProps) {
  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <span className="text-zinc-600 text-sm">No data available</span>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value + (d.secondaryValue || 0))) * 1.1 || 100;

  return (
    <div className={className}>
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((point, i) => {
          const primaryHeight = (point.value / maxValue) * 100;
          const secondaryHeight = ((point.secondaryValue || 0) / maxValue) * 100;

          return (
            <div
              key={i}
              className="flex-1 flex flex-col justify-end group relative"
            >
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 px-2 py-1 text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                <div className="text-white">{formatValue(point.value)}</div>
                {point.secondaryValue !== undefined && (
                  <div className="text-red-400">{point.secondaryValue} errors</div>
                )}
                <div className="text-zinc-500">{point.label}</div>
              </div>

              {/* Stacked bars */}
              <div className="flex flex-col-reverse w-full">
                {/* Secondary (errors) */}
                {point.secondaryValue !== undefined && point.secondaryValue > 0 && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${secondaryHeight}%` }}
                    transition={{ duration: 0.3, delay: i * 0.02 }}
                    className="w-full"
                    style={{ backgroundColor: secondaryColor }}
                  />
                )}
                {/* Primary */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${primaryHeight}%` }}
                  transition={{ duration: 0.5, delay: i * 0.02 }}
                  className="w-full hover:opacity-80 transition-opacity cursor-pointer"
                  style={{ backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      {showLabels && (
        <div className="flex justify-between mt-2 text-[10px] text-zinc-600 font-mono">
          <span>{data[0].label}</span>
          <span>{data[data.length - 1].label}</span>
        </div>
      )}
    </div>
  );
}
