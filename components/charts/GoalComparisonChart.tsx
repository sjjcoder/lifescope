"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { formatTWD } from "@/lib/calculator";

export interface GoalTrajectoryPoint {
  year: number;
  current: number;
  required: number;
}

export default function GoalComparisonChart({
  data,
  targetAssets,
}: {
  data: GoalTrajectoryPoint[];
  targetAssets: number;
}) {
  const formattedData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      displayCurrent: Math.round(d.current / 10000), // 轉成萬
      displayRequired: Math.round(d.required / 10000), // 轉成萬
    }));
  }, [data]);

  const displayTarget = Math.round(targetAssets / 10000);

  if (!data || data.length === 0) return null;

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formattedData}
          margin={{ top: 10, right: 10, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="year"
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => `第 ${val} 年`}
            dy={10}
          />
          <YAxis
            width={75}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => `${val} 萬`}
            dx={-10}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(26, 35, 50, 0.9)",
              backdropFilter: "blur(8px)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "12px",
              boxShadow: "var(--shadow-card)",
              color: "var(--text-primary)",
            }}
            itemStyle={{ color: "var(--text-primary)" }}
            labelFormatter={(label) => `第 ${label} 年`}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any) => {
              if (name === "displayCurrent") return [formatTWD(Number(value) * 10000), "照目前步調"];
              if (name === "displayRequired") return [formatTWD(Number(value) * 10000), "達成目標所需步調"];
              return [value, name];
            }}
          />
          <ReferenceLine
            y={displayTarget}
            stroke="var(--accent-secondary)"
            strokeDasharray="3 3"
            label={{ position: "insideTopLeft", value: `🎯 目標 ${displayTarget} 萬`, fill: "var(--accent-secondary)", fontSize: 12 }}
          />
          <Legend verticalAlign="bottom" height={36} />
          <Line
            type="monotone"
            dataKey="displayCurrent"
            name="照目前步調"
            stroke="var(--text-muted)"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="displayRequired"
            name="達成目標所需步調"
            stroke="var(--accent-primary)"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
