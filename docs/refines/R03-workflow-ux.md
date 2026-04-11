# R03 — Workflow UX: Split LLM Output + Copy Buttons + Retry After Approve

## What this builds

1. **Split LLM output into blocks** — AI responses contain multiple sections
   (e.g. `**Scene 1 — Title**`, `**Character — Name**`). Parse these into
   non-editable cards with a copy button on each.
2. **Copy button per block** — click to copy the section to clipboard.
3. **Retry after approve** — user can re-open a completed LLM step to regenerate
   if they change their mind.

## Files to change

```
src/components/LLMStepPanel.tsx      ← split response + copy buttons + re-open
src/components/WorkflowClient.tsx    ← expose re-open handler
```

---

## Step 1 — Response block parser

Parse a markdown-style LLM response into labelled sections. Pattern: lines starting
with `**` or `###` begin a new section.

Add this function to `LLMStepPanel.tsx`:

```ts
interface ResponseBlock {
  label: string | null   // section heading, or null for intro prose
  content: string
}

function parseBlocks(text: string): ResponseBlock[] {
  const lines = text.split('\n')
  const blocks: ResponseBlock[] = []
  let current: ResponseBlock = { label: null, content: '' }

  for (const line of lines) {
    // Detect section headers: **Title**, ### Title
    const boldHeading = line.match(/^\*\*(.+?)\*\*\s*$/)
    const h3Heading = line.match(/^###\s+(.+)$/)
    const heading = boldHeading?.[1] ?? h3Heading?.[1] ?? null

    if (heading) {
      if (current.content.trim()) blocks.push(current)
      current = { label: heading, content: '' }
    } else {
      current.content += (current.content ? '\n' : '') + line
    }
  }
  if (current.content.trim() || current.label) blocks.push(current)

  // If no headings were found, return as a single block
  if (blocks.length === 1 && !blocks[0].label) return blocks
  return blocks
}
```

---

## Step 2 — ResponseBlock component with copy button

Replace the `ResponseCard` component in `LLMStepPanel.tsx`:

```tsx
function ResponseBlocks({ content }: { content: string }) {
  const blocks = parseBlocks(content)

  // If 1 block with no label — fallback to simple card
  if (blocks.length === 1 && !blocks[0].label) {
    return <ResponseCard content={content} />
  }

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, i) => (
        <div key={i} className="rounded-[6px] border border-zinc-200 bg-zinc-50 overflow-hidden">
          {block.label && (
            <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2">
              <span className="text-[13px] font-medium text-zinc-700">{block.label}</span>
              <CopyButton text={block.content.trim()} />
            </div>
          )}
          <pre className="px-4 py-3 text-sm text-zinc-800 whitespace-pre-wrap font-sans leading-relaxed">
            {block.content.trim()}
          </pre>
          {!block.label && (
            <div className="flex justify-end border-t border-zinc-200 px-3 py-1.5">
              <CopyButton text={block.content.trim()} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      className="text-[12px] text-zinc-400 hover:text-zinc-700 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}
```

`LLMStepPanel.tsx` must have `'use client'` at the top (it uses `useState` in `CopyButton`).

---

## Step 3 — Use ResponseBlocks in LLMStepPanel

Replace all occurrences of `<ResponseCard content={...} />` with `<ResponseBlocks content={...} />`.

In ConversationThread, use `ResponseBlocks` for assistant messages:

```tsx
function ConversationThread({ messages }: { messages: Array<{ role: string; content: string }> }) {
  return (
    <div className="flex flex-col gap-4">
      {messages.map((m, i) => (
        <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
          {m.role === 'user' ? (
            <div className="max-w-[80%] rounded-[6px] border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-sm text-indigo-800">
              {m.content}
            </div>
          ) : (
            <ResponseBlocks content={m.content} />
          )}
        </div>
      ))}
    </div>
  )
}
```

---

## Step 4 — Retry after approve (re-open step)

### WorkflowClient.tsx

Add a `reopen` function. It resets a done step back to `pending` client-side only —
no API call needed because generate/approve are the server of truth. The user can
then regenerate and re-approve.

```ts
function reopen(n: number) {
  setSteps(prev => patch(prev, n, { status: 'pending', llmResponse: null, conversation: [], error: null }))
  setActiveStep(n)
}
```

Pass it to `LLMStepPanel`:

```tsx
<LLMStepPanel
  ...
  onReopen={activeStep < 11 ? () => reopen(activeStep) : undefined}
/>
```

### LLMStepPanel.tsx — add re-open button on done state

```tsx
{/* State 3: Approved / done */}
{state.status === 'done' && (
  <div>
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2 text-[13px] font-medium text-green-600">
        <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-green-500 text-[11px] text-white">✓</span>
        Approved
      </div>
      {onReopen && (
        <button
          onClick={onReopen}
          className="text-[13px] text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          ↺ Re-open
        </button>
      )}
    </div>
    <ResponseBlocks content={state.llmResponse!} />
  </div>
)}
```

Add `onReopen?: () => void` to `LLMStepPanelProps`.

---

## Verify

1. Generate step 1 → response is split into labelled blocks (Campaign concept, Hook, etc.)
2. Click "Copy" on a block → clipboard contains just that block's text
3. Approve step 1 → green "Approved" header with "↺ Re-open" button
4. Click "↺ Re-open" → step returns to pending state, generate button appears
5. Regenerate → new response replaces old

---

**Output:** LLM responses are split into labelled, copyable sections. Approved steps can be re-opened.

**Next step:** [R04-cloudinary.md](R04-cloudinary.md) — Cloudinary asset pipeline
