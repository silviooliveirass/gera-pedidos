"use client";

import { useState } from "react";

interface CompanyLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-8",
  md: "h-12",
  lg: "h-16"
};

export function CompanyLogo({ size = "md", className = "" }: CompanyLogoProps) {
  const [hasImageError, setHasImageError] = useState(false);

  if (hasImageError) {
    return (
      <div
        className={`flex ${sizeMap[size]} aspect-[3/1] items-center justify-center rounded-md bg-slate-200 px-3 text-xs font-semibold text-slate-700 ${className}`}
      >
        SUA LOGO
      </div>
    );
  }

  return (
    <img
      src="/logo-empresa.png"
      alt="Logo da empresa"
      className={`${sizeMap[size]} w-auto object-contain ${className}`}
      onError={() => setHasImageError(true)}
    />
  );
}
