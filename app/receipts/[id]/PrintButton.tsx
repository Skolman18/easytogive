"use client";
import { Download, Printer } from "lucide-react";

export default function PrintButton() {
  function downloadPdf() {
    // Open a print dialog pre-configured to print just the receipt.
    // All modern browsers support "Save as PDF" as a printer destination,
    // producing a clean PDF because the receipt page already has @media print styles.
    window.print();
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 border transition-colors hover:bg-gray-50"
        style={{ borderColor: "#e5e1d8" }}
        title="Open print dialog"
      >
        <Printer className="w-4 h-4" />
        Print
      </button>
      <button
        onClick={downloadPdf}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
        style={{ backgroundColor: "#1a7a4a" }}
        title='In the print dialog, choose "Save as PDF" as the destination'
      >
        <Download className="w-4 h-4" />
        Save PDF
      </button>
    </div>
  );
}
