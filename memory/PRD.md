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
- Reset password (/reset-password?token=..., token monouso 1h)
- Email reali di reset via Resend (mittente onboarding@resend.dev; in modalità test consegna solo all'email del proprietario account Resend; fallback: link loggato su console) — TESTATO
- Pagina Profilo /profilo: info account, cambio password (o impostazione password per account Google), cambio email con conferma password — TESTATO 100%
- Landing: sezione "Esempi" con 3 copertine generate AI + animazioni whileInView su esempi/CTA — TESTATO
- Protezione brute force (5 tentativi = lockout 15 min), indice unico email, seeding test user
- 15 crediti di benvenuto anche per registrazione email; interceptor axios refresh automatico
- Budget Emergent LLM Key RICARICATO: generazione outline (Claude) e copertina (Nano Banana) ri-verificate E2E ✅
- Serie di Libri (sequel): pulsante "Scrivi il seguito" su libri completati, prefill personaggi/impostazioni, contesto narrativo del vol. precedente iniettato in outline e capitoli, badge Vol. N in libreria — TESTATO 100% (continuità verificata con AI reale)
- Email di benvenuto Resend (15 crediti omaggio) a ogni nuovo iscritto (email o Google) — TESTATA (trigger ok; consegna limitata dalla modalità test Resend)
- Scaffale Serie in dashboard: volumi raggruppati per saga in ordine (serie_root_id, backfill dati esistenti) — TESTATO 100%
- Copertine Coordinate: toggle sui sequel per usare la copertina del vol. precedente come riferimento di stile (Nano Banana editing) — TESTATO E2E (coerenza visiva confermata)

## Backlog
- P1: test E2E delle feature non-AI (EPUB export, Pro Reader, Dashboard stats) — codice scritto, verifica pendente
- P2: verificare un dominio su resend.com/domains per inviare email di reset a qualsiasi destinatario (ora solo all'owner Resend)
- P2: usare APP_URL fisso invece dell'header Origin per il link di reset (hardening anti-phishing)
- P2: rigenerazione copertina con immagine di riferimento — FATTO (Nano Banana editing)
- P2: condivisione pubblica read-only — FATTO (`/p/{public_id}`)
- Monetizzazione crediti Stripe — FATTO (pacchetti Starter/Plus/Pro, benvenuto 15 cr)
- Futuro: gestione fatture/ricevute, piani in abbonamento, analytics di lettura sui link pubblici

## Note crediti
- Costi: testo (outline/capitolo/rigenerazione)=1, immagini (copertina/ritratto)=2
- Pacchetti: Starter 25/€4,99 · Plus 70/€11,99 · Pro 180/€24,99 · benvenuto 15

## Note
- Budget Emergent LLM Key esaurito durante i test → ricarica necessaria per nuove generazioni.
