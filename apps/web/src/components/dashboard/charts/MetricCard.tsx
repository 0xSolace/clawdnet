'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  sparkline?: number[];
  className?: string;
}

export default function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconColor = 'text-primary',
  sparkline,
  className = '',
}: MetricCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-zinc-950 border border-zinc-900 p-4 ${className}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`w-4 h-4 ${iconColor}`} />}
          <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-wide">
            {title}
          </span>
        </div>
        {change !== undefined && (
          <div
            className={`flex items-center gap-1 text-[11px] font-mono ${
              isPositive
                ? 'text-green-400'
                : isNegative
                ? 'text-red-400'
                : 'text-zinc-500'
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : isNegative ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            {isPositive && '+'}
            {change}%
          </div>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-white font-mono">{value}</div>
          {changeLabel && (
            <div className="text-[10px] text-zinc-600 mt-0.5">{changeLabel}</div>
          )}
        </div>

        {/* Mini sparkline */}
        {sparkline && sparkline.length > 0 && (
          <div className="flex items-end gap-0.5 h-8">
            {sparkline.slice(-12).map((v, i) => {
              const max = Math.max(...sparkline);
              const height = max > 0 ? (v / max) * 100 : 0;
              return (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.3, delay: i * 0.02 }}
                  className="w-1.5 bg-primary/30 hover:bg-primary/50 transition-colors"
                />
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
