"use client";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  labelClassName?: string;
  disabled?: boolean;
}

export default function Toggle({
  checked,
  onChange,
  label,
  labelClassName = "text-sm text-gray-700",
  disabled = false,
}: ToggleProps) {
  return (
    <label
      className={`flex items-center gap-3 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className="relative flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1"
        style={{
          width: 40,
          height: 22,
          backgroundColor: checked ? "#1a7a4a" : "#d1d5db",
        }}
      >
        <span
          className="absolute rounded-full bg-white shadow-sm transition-transform duration-200"
          style={{
            width: 18,
            height: 18,
            top: 2,
            left: 0,
            transform: checked ? "translateX(20px)" : "translateX(2px)",
          }}
        />
      </button>
      {label && <span className={labelClassName}>{label}</span>}
    </label>
  );
}
