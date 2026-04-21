"use client";

import React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { OrganizationDatum } from "@/lib/proxy-stats-data";
import { chartTheme } from "./chart-theme";

interface OrganizationChartProps {
  data: OrganizationDatum[];
}

export const OrganizationChart: React.FC<OrganizationChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
        <XAxis type="number" stroke={chartTheme.axis} fontSize={11} />
        <YAxis
          type="category"
          dataKey="organization"
          stroke={chartTheme.axis}
          fontSize={11}
          width={180}
          tickFormatter={(value: string) => (value.length > 24 ? `${value.slice(0, 23)}…` : value)}
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
        <Bar dataKey="count" name="Proxies" fill={chartTheme.palette[2]} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};
