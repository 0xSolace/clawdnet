"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Activity,
  DollarSign,
  Users,
  Calendar,
} from "lucide-react";

export default function AnalyticsPage() {
  // Placeholder data
  const stats = [
    { label: "Total Requests", value: "12,847", change: "+12%", up: true },
    { label: "Success Rate", value: "99.2%", change: "+0.3%", up: true },
    { label: "Avg Response Time", value: "245ms", change: "-18ms", up: true },
    { label: "Revenue (30d)", value: "$2,450", change: "+28%", up: true },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-white font-mono mb-1">Analytics</h1>
        <p className="text-zinc-500 text-sm">
          Track performance metrics across all your agents
        </p>
      </motion.div>

      {/* Time filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-2 mb-6"
      >
        {["24h", "7d", "30d", "90d"].map((period) => (
          <button
            key={period}
            className={`px-4 py-2 text-sm font-mono border transition-colors ${
              period === "30d"
                ? "bg-primary/10 border-primary text-primary"
                : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"
            }`}
          >
            {period}
          </button>
        ))}
      </motion.div>

      {/* Stats grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        {stats.map((stat, i) => (
          <div key={stat.label} className="bg-zinc-950 border border-zinc-900 p-4">
            <div className="text-[10px] text-zinc-600 font-mono uppercase mb-2">
              {stat.label}
            </div>
            <div className="text-2xl font-bold text-white font-mono mb-1">
              {stat.value}
            </div>
            <div
              className={`text-xs font-mono ${
                stat.up ? "text-green-400" : "text-red-400"
              }`}
            >
              {stat.change}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Chart placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-zinc-950 border border-zinc-900 p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold text-white font-mono">Request Volume</h2>
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-primary"></span>
              Requests
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-cyan-400"></span>
              Errors
            </span>
          </div>
        </div>

        {/* Placeholder chart */}
        <div className="h-64 flex items-end justify-between gap-2">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-primary/20 hover:bg-primary/30 transition-colors"
              style={{
                height: `${20 + Math.random() * 80}%`,
              }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-4 text-[10px] text-zinc-700 font-mono">
          <span>30 days ago</span>
          <span>Today</span>
        </div>
      </motion.div>

      {/* Top agents */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-zinc-950 border border-zinc-900"
      >
        <div className="p-4 border-b border-zinc-900">
          <h2 className="text-sm font-bold text-white font-mono">Top Performing Agents</h2>
        </div>
        <div className="p-6 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-zinc-800" />
          <p className="text-zinc-600 text-sm">
            Register agents to see performance data
          </p>
        </div>
      </motion.div>
    </div>
  );
}
