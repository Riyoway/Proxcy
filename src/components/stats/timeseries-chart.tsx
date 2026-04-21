"use client";

import React from "react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TimeSeriesDatum } from "@/lib/proxy-stats-data";
import { chartTheme } from "./chart-theme";

interface TimeSeriesChartProps {
  data: TimeSeriesDatum[];
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <defs>
          <linearGradient id="countGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartTheme.primary} stopOpacity={0.5} />
            <stop offset="100%" stopColor={chartTheme.primary} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="googleGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartTheme.success} stopOpacity={0.5} />
            <stop offset="100%" stopColor={chartTheme.success} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
        <XAxis dataKey="hour" stroke={chartTheme.axis} fontSize={11} interval="preserveStartEnd" />
        <YAxis stroke={chartTheme.axis} fontSize={11} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: chartTheme.tooltipBg,
            border: `1px solid ${chartTheme.tooltipBorder}`,
            borderRadius: 8,
            color: chartTheme.tooltipText,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: chartTheme.axis }} />
        <Area type="monotone" dataKey="count" name="Checks" stroke={chartTheme.primary} fill="url(#countGradient)" strokeWidth={2} />
        <Area type="monotone" dataKey="google" name="Google OK" stroke={chartTheme.success} fill="url(#googleGradient)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
};
