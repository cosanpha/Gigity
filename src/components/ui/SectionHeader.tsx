interface SectionHeaderProps {
  label: string
  count?: number
}

export function SectionHeader({ label, count }: SectionHeaderProps) {
  return (
    <div className="mb-2 flex items-center gap-3">
      <span className="shrink-0 text-[10.5px] font-bold tracking-[0.08em] whitespace-nowrap text-zinc-400 uppercase">
        {label}
      </span>
      <span className="flex-1 border-t border-zinc-200" />
      {count !== undefined && (
        <span className="shrink-0 rounded-full border border-zinc-200 bg-zinc-100 px-[7px] py-px text-[11px] font-semibold text-zinc-400">
          {count}
        </span>
      )}
    </div>
  )
}
