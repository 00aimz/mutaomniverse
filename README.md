# OMNIVERSE

One interconnected AI-powered digital universe — not eight separate websites.

OMNIVERSE combines eight substantial environments in one app, with one profile, one OMNI Gemini assistant, one notification center, and one settings system:

| Environment | What it is |
| --- | --- |
| **NEXUS** | Civilization simulator — seeded worlds, city building, citizens, economy, research, diplomacy |
| **ORBIT** | Space exploration — procedural star systems, planet scanning, spacecraft, outposts, alien contact |
| **SONORA** | Music studio — WebAudio step sequencer, piano roll, AI producer patterns, artists/albums |
| **EMPIRE** | Business simulator — found a company, products, AI competitors, real market simulation |
| **CASEFILE** | Detective universe — authored cases with fixed truths, evidence, interviews, scored conclusions |
| **AETHER** | Browser operating system — windowed desktop, file manager, editor, terminal, calendar, calculator |
| **CHRONICLES** | Fantasy adventure — procedural kingdoms, heroes, branching quests with persistent consequences |
| **SENTINEL** | Cybersecurity platform — simulated SOC, threat intelligence, investigations, labs, local SHA-256 hashing and password analysis |

## OMNI — the Gemini assistant

OMNI is reachable from every environment. It reads each environment’s live state and adapts its role: civilization advisor in NEXUS, ship computer in ORBIT, creative producer in SONORA, business consultant in EMPIRE, investigation assistant in CASEFILE, OS assistant in AETHER, guide in CHRONICLES, and security tutor in SENTINEL.

- Add a free Gemini API key in **Settings** in the app to switch OMNI live. The key is kept only in the browser and sent to Google only through the app’s server.
- With no key, OMNI runs in clearly labelled demo mode.
- Gemini powers intelligence, creativity, conversations and context. The app itself controls all deterministic mechanics, calculations, simulation state and storage — Gemini never silently overwrites saved data, and its structured proposals are validated and applied only when you tap Apply.
- Passwords entered in SENTINEL are never sent to Gemini and never stored.

## Tech stack

- TypeScript, React 19, Tailwind CSS 4
- Bun 1.3.10 (package manager and runtime)
- Drizzle ORM with SQL migrations in `drizzle/`
- Recharts, Zod, TanStack Query
- Server actions in `server/src/actions.ts`, schema in `server/src/schema.ts`

## Project structure

```
client/            React client — App.tsx, core.tsx, envs/ (one file per environment)
server/src/        Server actions and database schema
server/dist/       Built server bundle (generated, do not hand-edit)
drizzle/           Database migrations
```

## Running it

This source is a Muse TypeScript space. It is built, audited and shipped through Muse’s web-artifact tools — do not `bun run build` expecting it to publish the app, and do not hand-edit the built bundle.

For local inspection / typechecking:

```bash
bun install
bun run typecheck
bun run build
```

In the app itself, use **Settings → Backup export/import** to save and restore your universe.

## Simulated data

SOC, threat, network and other security data in SENTINEL is clearly labelled simulated / fictional demo data. File integrity uses real local SHA-256 hashing in the browser; only file name, size and hash are stored.

## License / use

Personal project by Mutawaqqil Sherif (@00aimz). Built with Muse.
