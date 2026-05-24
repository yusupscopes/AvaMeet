# AvaMeet

> AI-powered video meetings with intelligent agents that join, listen, and summarize.

AvaMeet is a SaaS platform for intelligent video conferencing. Create AI agents with custom instructions, schedule meetings where those agents participate in real time, and receive AI-generated summaries with structured notes after every call.

---

## What is AvaMeet?

AvaMeet lets you run video meetings where an AI agent sits in as a participant—not just a silent recorder, but an active voice that can listen, respond, and interact using OpenAI's Realtime API.

Each meeting is automatically recorded and transcribed. When the call ends, the transcript is processed in the background and distilled into a narrative overview and thematic notes with timestamps.

**Key capabilities:**

- **AI Agent Builder** — Create agents with custom names and instructions. Reuse them across meetings.
- **Video Conferencing** — Real-time video calls powered by [Stream Video](https://getstream.io/video/), with built-in recording and transcription.
- **AI Participant** — Your agent joins the call as a voice participant using OpenAI's Realtime API.
- **Automatic Summaries** — After the meeting, GPT-4o parses the transcript and generates a structured summary with overview and timestamped notes.
- **Meeting Lifecycle** — Meetings flow through states: `Upcoming` → `Active` → `Processing` → `Completed` (or `Canceled`).
- **Dashboard** — Manage agents and meetings, view details, and browse historical summaries.

---

## Why AvaMeet?

Traditional meeting tools record, but they don't *participate* or *think*. AvaMeet bridges that gap:

- **No more silent recordings.** Your AI agent can ask clarifying questions, take cues from the conversation, and behave according to instructions you define.
- **No more manual note-taking.** Transcripts are automatically summarized into readable, structured notes with timestamps.
- **No more context switching.** Everything—scheduling, calling, recording, summarizing—lives in one app.

Use cases include:

- **Interviews** — An agent asks preloaded questions and summarizes candidate responses.
- **Team Standups** — An agent captures action items and decisions.
- **Client Calls** — An agent takes structured notes while you focus on the conversation.
- **Research Sessions** — An agent probes follow-up questions based on your protocol.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 15](https://nextjs.org) (App Router) |
| Language | [TypeScript 5](https://www.typescriptlang.org) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) |
| UI Components | [shadcn/ui](https://ui.shadcn.com) + [Radix UI](https://www.radix-ui.com) |
| Auth | [better-auth](https://www.better-auth.com) (Google OAuth + Email/Password) |
| Database | [PostgreSQL](https://www.postgresql.org) via [Neon](https://neon.tech) |
| ORM | [Drizzle ORM](https://orm.drizzle.team) |
| API | [tRPC 11](https://trpc.io) |
| Data Fetching | [TanStack Query](https://tanstack.com/query) |
| Video | [Stream Video](https://getstream.io/video/) |
| AI / LLM | [OpenAI](https://openai.com) (GPT-4o, Realtime API) |
| Background Jobs | [Inngest](https://www.inngest.com) |
| Forms | [react-hook-form](https://react-hook-form.com) + [Zod](https://zod.dev) |

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│                Next.js App                    │
│  ┌─────────┐  ┌─────────┐  ┌──────────────┐   │
│  │  Auth   │  │  tRPC   │  │    Pages     │   │
│  │ better  │  │ Routers │  │ (RSC + RCC)  │   │
│  │  -auth  │  │         │  │              │   │
│  └────┬────┘  └────┬────┘  └──────┬───────┘   │
│       │            │              │           │
│  ┌────┴────────────┴──────────────┴───────┐   │
│  │         PostgreSQL (Neon)              │   │
│  │   user │ agent │ meeting │ session     │   │
│  └────────────────────────────────────────┘   │
│                                               │
│  ┌────────────────────────────────────────┐   │
│  │     Stream Video (Calls + Webhooks)    │   │
│  │  call.session_started                  │   │
│  │  call.session_participant_left         │   │
│  │  call.transcription_ready              │   │
│  └────────────────────────────────────────┘   │
│                                               │
│  ┌────────────────────────────────────────┐   │
│  │      Inngest (Background Jobs)         │   │
│  │  1. Fetch transcript                   │   │
│  │  2. Resolve speaker names              │   │
│  │  3. GPT-4o summarization             │   │
│  │  4. Save summary → meeting row         │   │
│  └────────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Module Structure

The app is organized by domain under `src/modules/`:

```
src/modules/
├── agent/          # CRUD for AI agents
├── meeting/        # CRUD for meetings + detail views by state
├── call/           # Video call UI (lobby, active, ended)
├── dashboard/      # App shell (sidebar, navbar, layout)
├── auth/           # Sign-in / sign-up UI
└── home/           # Dashboard home (placeholder)
```

---

## Getting Started

### Prerequisites

- Node.js (see `package.json` `engines` field)
- PostgreSQL database (e.g., [Neon](https://neon.tech))
- [Stream Video](https://getstream.io/video/) account
- [OpenAI](https://platform.openai.com) API key
- Google OAuth credentials (optional, for Google sign-in)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Fill in the required values:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Random secret for auth sessions (generate with `openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Your app URL (e.g., `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | For Google OAuth (optional) |
| `NEXT_PUBLIC_APP_URL` | Public app URL |
| `NEXT_PUBLIC_STREAM_VIDEO_API_KEY` | Stream Video public API key |
| `STREAM_VIDEO_SECRET_KEY` | Stream Video secret key |
| `OPENAI_API_KEY` | OpenAI API key for summarization & real-time agent |

### 3. Set Up the Database

```bash
npm run db:push
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Run Background Jobs (Inngest)

In a separate terminal:

```bash
npm run dev:inngest
```

### 6. Expose Local Server for Webhooks (Optional)

Stream Video sends webhooks to your app. For local development, expose your server:

```bash
npm run dev:webhook
```

This uses `localtunnel` at `https://avameet.loca.lt`. Configure your Stream Video app to send webhooks to `https://<your-domain>/api/webhook`.

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push Drizzle schema changes to database |
| `npm run db:studio` | Open Drizzle Studio for database inspection |
| `npm run dev:webhook` | Expose localhost via localtunnel for webhooks |
| `npm run dev:inngest` | Start Inngest dev server for background jobs |

---

## Webhooks

AvaMate expects webhooks from Stream Video at `/api/webhook`. The following events are handled:

| Event | Action |
|-------|--------|
| `call.session_started` | Connects the AI agent to the call via OpenAI Realtime API |
| `call.session_participant_left` | Ends the call session |
| `call.session_ended` | Marks meeting as `Processing` |
| `call.transcription_ready` | Saves transcript URL and triggers Inngest summarization job |
| `call.recording_ready` | Saves recording URL |

Ensure your Stream Video app is configured with the webhook URL and a valid signing secret.

---

## AI Summarization Flow

When a meeting ends and the transcription is ready, the following happens asynchronously:

1. **Transcript fetched** — JSONL transcript is downloaded from Stream Video.
2. **Speaker resolution** — Speaker IDs are mapped to actual names using the `user` and `agent` tables.
3. **Summarization** — A GPT-4o agent processes the transcript and produces:
   - An **Overview** (narrative summary)
   - **Notes** (thematic sections with timestamp ranges and bullet points)
4. **Persisted** — The summary is saved to the `meeting` row, and the status becomes `Completed`.

---

## License

MIT

---

Built with [Next.js](https://nextjs.org), [Stream Video](https://getstream.io/video/), and [OpenAI](https://openai.com).
