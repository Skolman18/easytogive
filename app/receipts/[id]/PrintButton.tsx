"use client";
import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white print:hidden"
      style={{ backgroundColor: "#1a7a4a" }}
    >
      <Printer className="w-4 h-4" />
      Print / Save PDF
    </button>
  );
}
