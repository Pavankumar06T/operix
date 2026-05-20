interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatter?: (value: number, name: string) => string;
}

export default function ChartTooltip({ active, payload, label, formatter }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-[#1C1C28] border border-[#2A2A3A] rounded-lg p-3 shadow-xl">
      {label && <p className="text-xs text-[#5A5A72] mb-2">{label}</p>}
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-[#9898B0]">{entry.name}:</span>
          <span className="text-sm font-semibold text-[#F8F8FF]">
            {formatter ? formatter(entry.value, entry.name) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}
