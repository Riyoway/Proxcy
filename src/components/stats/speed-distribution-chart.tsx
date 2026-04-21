"use client";

import React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SpeedBucketDatum } from "@/lib/proxy-stats-data";
import { chartTheme } from "./chart-theme";

interface SpeedDistributionChartProps {
  data: SpeedBucketDatum[];
}

export const SpeedDistributionChart: React.FC<SpeedDistributionChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
        <XAxis dataKey="label" stroke={chartTheme.axis} fontSize={11} />
        <YAxis stroke={chartTheme.axis} fontSize={11} />
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
        <Bar dataKey="count" name="Proxies" fill={chartTheme.palette[1]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};
