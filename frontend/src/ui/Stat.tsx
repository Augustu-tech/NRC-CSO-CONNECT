import { ReactNode } from "react";
import { Card } from "./Card";

export function Stat({
  label, value, hint, tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "accent" | "positive" | "negative";
}) {
  const toneClass =
    tone === "accent" ? "text-faith-700"
    : tone === "positive" ? "text-emerald-700"
    : tone === "negative" ? "text-red-600"
    : "text-slate-900";
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${toneClass}`}>{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </Card>
  );
}
