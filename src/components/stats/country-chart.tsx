"use client";

import React from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CountryDatum } from "@/lib/proxy-stats-data";
import { chartTheme } from "./chart-theme";

interface CountryChartProps {
  data: CountryDatum[];
}

export const CountryChart: React.FC<CountryChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
        <XAxis type="number" stroke={chartTheme.axis} fontSize={11} />
        <YAxis
          type="category"
          dataKey="country"
          stroke={chartTheme.axis}
          fontSize={11}
          width={110}
          tickFormatter={(value: string) => (value.length > 14 ? `${value.slice(0, 13)}…` : value)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: chartTheme.tooltipBg,
            border: `1px solid ${chartTheme.tooltipBorder}`,
            borderRadius: 8,
            color: chartTheme.tooltipText,
            fontSize: 12,
          }}
          cursor={{ fill: "rgba(161, 161, 170, 0.08)" }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: chartTheme.axis }} />
        <Bar dataKey="total" name="Total" fill={chartTheme.primary} radius={[0, 4, 4, 0]} />
        <Bar dataKey="google" name="Google OK" fill={chartTheme.success} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};
