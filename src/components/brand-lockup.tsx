"use client";

interface BrandLockupProps {
  className?: string;
}

export function BrandLockup({ className = "" }: BrandLockupProps) {
  return (
    <div
      className={`inline-flex flex-col rounded-xl border border-slate-200/80 bg-white px-4 py-2 shadow-sm ring-1 ring-brand-100 ${className}`}
    >
      <span className="text-sm font-bold tracking-tight text-slate-900">Gera Pedidos</span>
      <span className="mt-1 h-[2px] w-full rounded-full bg-brand-500" />
    </div>
  );
}
