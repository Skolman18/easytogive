"use client";
import { useState } from "react";
import { Download, Printer, X, CheckCircle } from "lucide-react";

export default function PrintButton() {
  const [showGuide, setShowGuide] = useState(false);

  function triggerPrint() {
    window.print();
  }

  function handleDownload() {
    setShowGuide(true);
    // Small delay so user sees the guide before the print dialog opens
    setTimeout(() => window.print(), 300);
  }

  return (
    <>
      <div className="flex items-center gap-2 print:hidden">
        <button
          onClick={triggerPrint}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 border transition-colors hover:bg-gray-50"
          style={{ borderColor: "#e5e1d8" }}
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: "#1a7a4a" }}
        >
          <Download className="w-4 h-4" />
          Save PDF
        </button>
      </div>

      {/* PDF guide overlay */}
      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 print:hidden"
          style={{ backgroundColor: "rgba(13,17,23,0.5)", backdropFilter: "blur(3px)" }}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6"
            style={{ border: "1px solid #e5e1d8" }}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "#e8f5ee" }}
              >
                <Download className="w-5 h-5" style={{ color: "#1a7a4a" }} />
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="font-display text-lg text-gray-900 mb-1">
              Saving your receipt as PDF
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Your browser's print dialog is opening. Follow these steps:
            </p>

            <ol className="space-y-3 mb-5">
              {[
                { step: "1", text: 'Look for "Destination" or "Printer" in the dialog' },
                { step: "2", text: 'Select "Save as PDF" from the dropdown' },
                { step: "3", text: 'Click "Save" to download your receipt' },
              ].map(({ step, text }) => (
                <li key={step} className="flex items-start gap-3 text-sm text-gray-700">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: "#1a7a4a" }}
                  >
                    {step}
                  </span>
                  {text}
                </li>
              ))}
            </ol>

            <div
              className="rounded-lg p-3 flex items-start gap-2.5 mb-4"
              style={{ backgroundColor: "#f0fdf4", border: "1px solid #86efac" }}
            >
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#1a7a4a" }} />
              <p className="text-xs text-green-800 leading-relaxed">
                This receipt is a valid IRS tax document. Keep the PDF with your tax records.
              </p>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-600 border hover:bg-gray-50 transition-colors"
              style={{ borderColor: "#e5e1d8" }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
