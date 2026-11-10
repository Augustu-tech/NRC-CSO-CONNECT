import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger";

const BASE = "inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium px-4 py-2 transition disabled:opacity-50 disabled:cursor-not-allowed";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-faith-700 hover:bg-faith-800 text-white",
  secondary: "bg-white border border-slate-300 hover:bg-slate-50 text-slate-700",
  danger: "bg-red-600 hover:bg-red-700 text-white",
};

export function Button({
  variant = "primary", children, className = "", ...rest
}: { variant?: Variant; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${BASE} ${VARIANTS[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
