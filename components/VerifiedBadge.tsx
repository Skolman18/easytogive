import { CheckCircle } from "lucide-react";

interface VerifiedBadgeProps {
  size?: "sm" | "md" | "lg";
}

export default function VerifiedBadge({ size = "md" }: VerifiedBadgeProps) {
  const sizes = {
    sm: { icon: "w-3.5 h-3.5", text: "text-xs", padding: "px-2 py-0.5" },
    md: { icon: "w-4 h-4", text: "text-sm", padding: "px-3 py-1" },
    lg: { icon: "w-5 h-5", text: "text-base", padding: "px-4 py-1.5" },
  };
  const s = sizes[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${s.padding} rounded-full font-semibold text-white ${s.text}`}
      style={{ backgroundColor: "#1a7a4a" }}
    >
      <CheckCircle className={`${s.icon} flex-shrink-0`} />
      Verified
    </span>
  );
}
