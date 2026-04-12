export function StepLlmModelCaption({
  model,
}: {
  model: string | null | undefined
}) {
  if (!model) return null
  return (
    <p
      className="mt-1 truncate font-mono text-[11px] leading-snug text-zinc-500"
      title={model}
    >
      {model}
    </p>
  )
}
