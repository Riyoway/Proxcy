"use client";

import React from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ProtocolDatum } from "@/lib/proxy-stats-data";
import { chartTheme } from "./chart-theme";

interface ProtocolChartProps {
  data: ProtocolDatum[];
}

export const ProtocolChart: React.FC<ProtocolChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((_, idx) => (
            <Cell key={`cell-${idx}`} fill={chartTheme.palette[idx % chartTheme.palette.length]} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: chartTheme.tooltipBg,
            border: `1px solid ${chartTheme.tooltipBorder}`,
            borderRadius: 8,
            color: chartTheme.tooltipText,
            fontSize: 12,
          }}
        />
        <Legend
          verticalAlign="bottom"
          iconSize={10}
          wrapperStyle={{ fontSize: 12, color: chartTheme.axis }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};
