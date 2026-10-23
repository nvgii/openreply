"use client";

import { useI18n } from "@/lib/i18n/provider";


/**
 * Stat Card
 *
 * Metric panel with label, value, and optional trend.
 */

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
}

export default function StatCard({ label, value, trend, trendUp }: StatCardProps) {
  const { t } = useI18n();
  return (
    <div className="bg-background p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="type-statement mt-3 text-3xl text-foreground">{value}</p>
      {trend && (
        <p className={`text-xs mt-1 ${trendUp ? "text-success" : "text-error"}`}>
          {trendUp ? "Up" : t("Down")} {trend}
        </p>
      )}
    </div>
  );
}
