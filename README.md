# Telegram Guardian Bot

A custom Telegram guardian bot built with **TanStack Start**, **React**, and **shadcn/ui**. When a user requests to join your group, they are presented with a custom onboarding Mini App that asks questions and requires agreeing to Terms of Service before being approved.

## Features

- **Custom Onboarding Mini App** — applicants answer questions and agree to Terms of Service
- **SQLite Database** — tracks all join requests, answers, and decisions
- **Telegram Webhook** — receives join request updates and opens the mini app
- **Secure initData Verification** — validates the Telegram Mini App context
- **Type-Safe** — built with TanStack Start, TanStack Router, and TypeScript

## Tech Stack

- **TanStack Start** — Full-stack React framework
- **TanStack Router** — File-based routing
- **better-sqlite3** — SQLite database
- **shadcn/ui** — UI components
- **Tailwind CSS** — Styling

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
WEB_APP_URL=https://yourdomain.com/verify
```

Get your bot token from [@BotFather](https://t.me/BotFather).

### 3. Set the Telegram Webhook

After deploying, tell Telegram where to send updates:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://yourdomain.com/webhook"
```

### 4. Add Bot to Your Group

1. Add the bot to your Telegram group
2. Promote it to **admin** with the **Invite Users** permission
3. Enable **"Approve New Members"** in group settings

### 5. Run Locally

```bash
npm run dev
```

Visit `http://localhost:3000` for the dashboard.

### 6. Build for Production

```bash
npm run build
npm run start
```

## Architecture

| File | Purpose |
|------|---------|
| `src/routes/webhook.ts` | Receives Telegram `chat_join_request` updates |
| `src/routes/api/verify.ts` | API endpoint for the Mini App to submit answers |
| `src/routes/verify.tsx` | The Mini App onboarding page |
| `src/lib/db.ts` | SQLite database and queries |
| `src/lib/telegram.ts` | Telegram API helper and `initData` verification |

## Flow

1. User requests to join your group
2. Telegram sends a webhook to `/webhook` with `chat_join_request`
3. Bot stores the request and calls `sendChatJoinRequestWebApp` to open the mini app
4. User sees the onboarding page at `/verify` with questions + Terms of Service
5. User submits answers via POST to `/api/verify`
6. Server verifies `initData`, stores answers, and calls `answerChatJoinRequestQuery` with `approve` or `decline`

## Customizing Questions

Edit `src/routes/verify.tsx` and modify the `QUESTIONS` array:

```tsx
const QUESTIONS = [
  {
    id: "name",
    label: "What is your name?",
    type: "text",
    placeholder: "Enter your full name",
    required: true,
  },
  // Add more questions...
]
```

## Customizing Terms of Service

Edit the `TERMS_TEXT` constant in `src/routes/verify.tsx`:

```tsx
const TERMS_TEXT = `
YOUR TERMS OF SERVICE

1. ...
2. ...
`
```

## License

MIT
