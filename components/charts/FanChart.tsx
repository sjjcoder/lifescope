"use client";

import { useMemo } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
} from "recharts";
import { formatTWD } from "@/lib/calculator";

export interface PercentileData {
  year: number;
  p90: number;
  p75: number;
  p50: number;
  p25: number;
  p10: number;
}

export default function FanChart({ data }: { data: PercentileData[] }) {
  const formattedData = useMemo(() => {
    return data.map((d) => ({
      year: d.year,
      // For standard Recharts ranging areas, we send arrays [min, max]
      range90_10: [Math.round(d.p10 / 10000), Math.round(d.p90 / 10000)],
      range75_25: [Math.round(d.p25 / 10000), Math.round(d.p75 / 10000)],
      median: Math.round(d.p50 / 10000),
      original: d
    }));
  }, [data]);

  if (!data || data.length === 0) return null;

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={formattedData}
          margin={{ top: 10, right: 10, left: 20, bottom: 15 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
          <XAxis
            dataKey="year"
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => `第 ${val} 年`}
            dy={10}
            minTickGap={30}
          />
          <YAxis
            width={80}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => `${val} 萬`}
            dx={-10}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(26, 35, 50, 0.95)",
              backdropFilter: "blur(8px)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "12px",
              boxShadow: "var(--shadow-card)",
              color: "var(--text-primary)",
            }}
            labelFormatter={(label) => `📉 退場第 ${label} 年`}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any, props: any) => {
              const key = props?.dataKey;
              if (key === "median") return [formatTWD(Number(value) * 10000), name];
              if (key === "range75_25" || key === "range90_10") return [`${formatTWD(value[0] * 10000)} ~ ${formatTWD(value[1] * 10000)}`, name];
              return [value, name];
            }}
          />
          
          <ReferenceLine y={0} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" label={{ position: 'insideTopLeft', value: '破產警戒線', fill: '#ef4444', fontSize: 12 }} />

          {/* Outer Fan P10-P90 */}
          <Area
            type="monotone"
            dataKey="range90_10"
            name="極端狀況區 (P10-P90)"
            stroke="var(--accent-primary)"
            strokeOpacity={0.35}
            strokeWidth={1}
            fill="var(--accent-primary)"
            fillOpacity={0.22}
          />

          {/* Inner Fan P25-P75 */}
          <Area
            type="monotone"
            dataKey="range75_25"
            name="大概率落點區 (P25-P75)"
            stroke="var(--accent-primary)"
            strokeOpacity={0.5}
            strokeWidth={1}
            fill="var(--accent-primary)"
            fillOpacity={0.42}
          />

          {/* Median Line P50 */}
          <Line
            type="monotone"
            dataKey="median"
            name="資產中位數 (P50)"
            stroke="var(--accent-primary)"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
