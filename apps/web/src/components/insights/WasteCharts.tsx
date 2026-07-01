'use client';

import { useState } from 'react';
import {
  Area,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type WasteTrendPoint = {
  label: string;
  totalLoss: number;
  discardedCount: number;
};

export type WasteReasonPoint = {
  name: string;
  value: number;
  color: string;
};

type TooltipPayload = {
  color?: string;
  name?: string;
  value?: number;
  payload?: WasteTrendPoint;
};

function formatWon(value: number) {
  return `₩${value.toLocaleString('ko-KR')}`;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl bg-surface-container-lowest px-4 py-3 shadow-ambient">
      <p className="mb-2 text-xs font-bold text-on-surface">{label}</p>
      <div className="space-y-1">
        {payload.map((item) => (
          <p key={item.name} className="flex items-center gap-2 text-xs text-on-surface-variant">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
            <span>{item.name}</span>
            <span className="font-bold text-on-surface">
              {item.name === '손실액'
                ? formatWon(item.value ?? 0)
                : `${(item.value ?? 0).toLocaleString('ko-KR')}개`}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function WasteLineChart({
  data,
  height = 320,
  showLoss = true,
  showCount = true,
}: {
  data: WasteTrendPoint[];
  height?: number;
  showLoss?: boolean;
  showCount?: boolean;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 18, bottom: 8, left: 0 }}>
          <defs>
            <linearGradient id="loss-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.16} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--color-outline-variant)"
            strokeDasharray="4 8"
            strokeOpacity={0.4}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 12, fontWeight: 700 }}
            dy={10}
          />
          <YAxis
            yAxisId="loss"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 11, fontWeight: 700 }}
            tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
            width={48}
          />
          <YAxis yAxisId="count" orientation="right" hide />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--color-primary)' }} />
          {showLoss && (
            <Area
              yAxisId="loss"
              type="monotone"
              dataKey="totalLoss"
              name="손실액"
              stroke="none"
              fill="url(#loss-fill)"
              isAnimationActive={false}
            />
          )}
          {showLoss && (
            <Line
              yAxisId="loss"
              type="monotone"
              dataKey="totalLoss"
              name="손실액"
              stroke="var(--color-primary)"
              strokeWidth={4}
              dot={{ r: 4, strokeWidth: 3, fill: 'var(--color-surface-container-lowest)' }}
              activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--color-primary)' }}
            />
          )}
          {showCount && (
            <Line
              yAxisId="count"
              type="monotone"
              dataKey="discardedCount"
              name="품목수"
              stroke="var(--color-tertiary-container)"
              strokeWidth={3}
              dot={{ r: 3, strokeWidth: 2, fill: 'var(--color-surface-container-lowest)' }}
              activeDot={{ r: 5, strokeWidth: 0, fill: 'var(--color-tertiary-container)' }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyWasteTrend({ data }: { data: WasteTrendPoint[] }) {
  const [showLoss, setShowLoss] = useState(true);
  const [showCount, setShowCount] = useState(true);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.05rem] text-primary">
            Daily trend
          </p>
          <h2 className="font-display text-3xl font-bold text-on-surface">
            이번 달 일별 폐기 흐름
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-pressed={showLoss}
            onClick={() => setShowLoss((prev) => !prev)}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
              showLoss
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: showLoss ? 'var(--color-on-primary)' : 'var(--color-primary)',
              }}
              aria-hidden="true"
            />
            손실액
          </button>
          <button
            type="button"
            aria-pressed={showCount}
            onClick={() => setShowCount((prev) => !prev)}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
              showCount
                ? 'bg-tertiary-container text-on-tertiary'
                : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: showCount
                  ? 'var(--color-on-tertiary)'
                  : 'var(--color-tertiary-container)',
              }}
              aria-hidden="true"
            />
            품목수
          </button>
        </div>
      </div>
      <WasteLineChart data={data} height={300} showLoss={showLoss} showCount={showCount} />
    </>
  );
}

export function WasteReasonChart({ data }: { data: WasteReasonPoint[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const mainReason = data[0];
  const mainPercent = total > 0 && mainReason ? Math.round((mainReason.value / total) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="relative h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="64%"
              outerRadius="86%"
              paddingAngle={3}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [
                `${Number(value).toLocaleString('ko-KR')}개`,
                String(name),
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-display text-4xl font-bold text-on-surface">{mainPercent}%</p>
          <p className="text-xs font-semibold text-on-surface-variant">
            {mainReason?.name ?? '데이터 없음'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {data.map((item) => {
          const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={item.name} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />
                <span className="text-sm font-semibold text-on-surface-variant">{item.name}</span>
              </div>
              <span className="font-display text-lg font-bold text-on-surface">{percent}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
