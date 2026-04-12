"use client";

interface Props {
  value: string;
  onChange: (date: string) => void;
}

export default function DatePicker({ value, onChange }: Props) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
    />
  );
}
