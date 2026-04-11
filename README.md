# Gigity — AI Video Workflow Orchestrator

Gigity is a workflow tool for indie makers who create advertising videos using AI. Instead of re-explaining your product context to ChatGPT every session and tab-switching between 5+ tools, Gigity saves your brand profile once and pre-generates every prompt across the full 10-step video production pipeline.

**The problem it solves:** A single advertising video currently takes 4-6 hours — not because generation is slow, but because context is lost between sessions and tools. Gigity eliminates the context-switching. You still use ChatGPT, SunoAI, KlingAI, and CapCut — but you stop re-explaining.

---

## How It Works

### The 10-Step Video Production Workflow

| Step | What happens                                          | Tool used                   |
| ---- | ----------------------------------------------------- | --------------------------- |
| 1    | Set up business context and brand profile             | Gigity (saved once)         |
| 2    | Add reference video examples                          | Gigity                      |
| 3    | Generate a short advertising story                    | ChatGPT (prompt pre-filled) |
| 4    | Turn the story into song lyrics                       | ChatGPT (prompt pre-filled) |
| 5    | Generate a SunoAI music prompt                        | ChatGPT → SunoAI            |
| 6    | Generate character reference images                   | ChatGPT / image tool        |
| 7    | Generate per-scene action images (one per lyric line) | ChatGPT / image tool        |
| 8    | Animate each scene image into a short video clip      | KlingAI                     |
| 9    | Assemble clips, music, logo into the final video      | CapCut                      |
| 10   | Upload to TikTok, YouTube Shorts, Instagram Reels     | Manual                      |

Gigity handles steps 1-2 (brand setup), pre-fills the prompts for steps 3-8, and tracks your progress across all 10 steps. Your brand context — product name, description, target audience, tone, characters — is saved once and injected into every prompt automatically.

---

## Tech Stack

| Layer           | Technology                        |
| --------------- | --------------------------------- |
| Framework       | [Next.js 16](https://nextjs.org/) |
| UI              | React 19, Tailwind CSS 4          |
| Database        | MongoDB                           |
| Auth            | NextAuth (v2, deferred)           |
| Package manager | Bun                               |
| Language        | TypeScript 5                      |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (package manager)
- [MongoDB](https://www.mongodb.com/) instance (local or Atlas)
- Node.js 20+

### Installation

```bash
git clone https://github.com/NaKMiers/Gigity.git
cd Gigity
bun install
```

### Environment Setup

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:

```env
MONGODB=<your_mongodb_connection_string>
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<your_next_auth_secret>
CRON_SECRET=<your_cron_secret>
BCRYPT_SALT_ROUND=<10>
```

### Run Locally

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Dashboard — video project list
│   ├── brand/
│   │   ├── new/            # Brand profile setup
│   │   └── [id]/edit/      # Edit brand profile
│   └── projects/
│       └── [id]/           # Workflow view — 10-step stepper
├── lib/
│   ├── workflow-templates.ts   # The 10 prompt templates with {{variable}} interpolation
│   └── mongodb.ts              # DB connection
├── models/
│   ├── BrandProfile.ts     # Product info, characters, tone, audience
│   └── VideoProject.ts     # Per-video progress tracker with WorkflowStep[]
└── components/
    └── workflow/           # Step card, sidebar, copy-to-clipboard, progress bar
```

---

## Data Model

### Brand Profile

Your product context — entered once, injected into every prompt.

```ts
{
  name: string              // "Deewas"
  description: string       // "Personal financial management app with AI"
  targetAudience: string    // "Young adults managing their first salary"
  tone: string              // "Warm, encouraging, modern"
  platforms: string[]       // ["TikTok", "YouTube", "Instagram Reels"]
  exampleVideoUrls: string[]
  characters: {
    name: string
    description: string
    referenceImageUrl: string
  }[]
  logoUrl: string
}
```

### Video Project

Tracks one video end-to-end across all 10 steps.

```ts
{
  title: string // "Deewas - March campaign video 1"
  status: 'in_progress' | 'completed'
  steps: {
    stepNumber: number
    generatedPrompt: string // brand context already interpolated
    userOutput: string // story text, lyrics, etc. (you paste this)
    outputAssetUrl: string // image/video URL (you paste after generating)
    status: 'pending' | 'done'
  }
  ;[]
}
```

### Prompt Template Variables

Templates in `workflow-templates.ts` use `{{variable}}` interpolation:

```
{{brand_name}}  {{brand_description}}  {{target_audience}}  {{tone}}
{{character_name}}  {{character_description}}  {{character_reference}}
{{platform}}  {{example_videos}}
```

---

## Roadmap

### V1 — Personal Tool (current)

- [x] Project scaffolding (Next.js 16, Tailwind 4, MongoDB, Bun)
- [ ] Brand profile CRUD (`/brand/new`, `/brand/[id]/edit`)
- [ ] Workflow template engine (`workflow-templates.ts`, variable interpolation)
- [ ] Video project creation and listing
- [ ] 10-step workflow UI (sidebar + step card + copy button + mark done)
- [ ] Produce first Deewas ad end-to-end using Gigity

### V2 — Multi-User SaaS

- [ ] NextAuth authentication
- [ ] Multi-brand profile support
- [ ] Campaign grouping across multiple videos
- [ ] ChatGPT API integration (eliminate copy-paste for text steps)
- [ ] SunoAI / KlingAI API integration (eliminate copy-paste for media steps)
- [ ] Vercel deployment with public URL

---

## Why Not Just Use Existing Tools?

**AutoShorts, Runway, Pika, Pictory** — these tools solve video generation in isolation. None of them know your product, your characters, or your brand tone. You re-explain from scratch every session.

Gigity is not a generator. It is an orchestrator. It holds your context so you don't have to.

---

## Contributing

This is currently a personal tool. If you're building something similar and want to collaborate, open an issue.

---

## License

MIT

