# PRD — Libroteca AI

## Problema (originale, IT)
"Crea un'app con AI che, inserendo solo un'idea, genera libri in automatico sviluppando una trama e creando le copertine. Deve permettere di inserire personaggi con nomi, caratteristiche, abilità, punti di forza e debolezza."

## Stack & Integrazioni
- FastAPI + React + MongoDB
- Testo: Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) e GPT-5.2 — Emergent LLM Key
- Copertine: Gemini Nano Banana (`gemini-3.1-flash-image-preview`) e GPT Image 1
- Auth: Emergent-managed Google OAuth (sessioni + cookie httpOnly)

## Personas
- Aspiranti scrittori / hobbisti che vogliono trasformare idee in libri completi.

## Core requirements
- Input idea → generazione titolo, sinossi, capitoli (IT)
- Gestione personaggi (nome, ruolo, caratteristiche, abilità, forza, debolezza)
- Generazione copertine AI
- Libreria personale + lettore immersivo

## Implementato (2026-05-29)
- Google login (Emergent Auth) + rotte protette
- CRUD libri + libreria dashboard
- Generazione libro (testo) via Claude/GPT — VERIFICATO (Claude)
- Generazione copertina via Nano Banana — VERIFICATO; GPT Image 1 codice corretto (bloccato da budget key)
- CRUD personaggi (UI dossier bento) — VERIFICATO
- Lettore con indice capitoli, tema editoriale (Playfair + Manrope)

## Implementato (2026-06-12)
- Auth Email & Password (JWT httpOnly cookies, access 15min + refresh 7gg) accanto a Google — TESTATO 100% (backend+frontend)
- Pagina /login con tab Accedi/Registrati + pulsante Google + password dimenticata
- Reset password (/reset-password?token=..., link loggato su console backend, token monouso 1h)
- Protezione brute force (5 tentativi = lockout 15 min), indice unico email, seeding test user
- 15 crediti di benvenuto anche per registrazione email
- Interceptor axios per refresh automatico del token

## Backlog
- P1: test E2E delle feature non-AI (EPUB export, Pro Reader, Dashboard stats) — codice scritto, verifica pendente
- P1: animazioni/sezione esempi su Landing (piano UI approvato, non ancora implementato)
- P1: regressione completa generazione AI quando il budget LLM viene ricaricato
- P2: rigenerazione copertina con immagine di riferimento — FATTO (Nano Banana editing)
- P2: condivisione pubblica read-only — FATTO (`/p/{public_id}`)
- Monetizzazione crediti Stripe — FATTO (pacchetti Starter/Plus/Pro, benvenuto 15 cr)
- Futuro: gestione fatture/ricevute, piani in abbonamento, analytics di lettura sui link pubblici

## Note crediti
- Costi: testo (outline/capitolo/rigenerazione)=1, immagini (copertina/ritratto)=2
- Pacchetti: Starter 25/€4,99 · Plus 70/€11,99 · Pro 180/€24,99 · benvenuto 15

## Note
- Budget Emergent LLM Key esaurito durante i test → ricarica necessaria per nuove generazioni.
