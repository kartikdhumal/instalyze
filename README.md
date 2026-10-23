# Instalyze

Upload your Instagram data export, pick a conversation and explore its analytics and full message history. Everything runs in the browser. The zip is never uploaded anywhere.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000 and drop the zip.

## Getting the export

1. Instagram app → Settings → Accounts Center → Your information and permissions
2. Download your information → Some of your information → tick **Messages**
3. Download to device, Format **JSON**, Date range **All time**
4. Download the zip from the email Instagram sends

## Features

- Searchable conversation dropdown, sorted by message count, with message requests tagged
- Analytics: the same charts as Walyze (timeline, hours, weekdays, words, emojis, links, streaks, per-person stats) plus a Reels and Posts section (who shares most, creators, caption hashtags, reactions)
- Instagram-style chat view with photos, videos and voice notes read straight from the zip, reactions, shared reels and search with jump between matches
- PDF download of the analytics

## How it reads the export

- Chats live in `messages/inbox/<chat>/message_N.json` (and `message_requests`). Big chats are split into files of 10,000 messages, newest first.
- Instagram stores text as broken UTF-8 (`Ã©` instead of `é`), repaired in `lib/instagram/normalize.ts`.
- Lines Instagram writes itself ("sent an attachment.", "Reacted ❤️ to your message", "Liked a message", "(edited)", quiet mode and group notices) are removed or shown as system lines, so they never count as words.
- The account owner is the person who appears in every chat.

## Code map

| Path | What it does |
|------|--------------|
| `lib/instagram/archive.ts` | Opens the zip, lists chats, loads a chat, serves media |
| `lib/instagram/normalize.ts` | Turns raw Instagram JSON into clean messages |
| `lib/analytics.ts` | All analytics calculations |
| `components/AnalyticsView.tsx` | Analytics charts |
| `components/chat/` | Instagram-style chat view and search |
| `components/ConversationPicker.tsx` | Searchable conversation dropdown |
