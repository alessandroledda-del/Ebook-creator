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

## Backlog
- P1: Generazione "appearance" personaggi con immagine AI
- P1: Esportazione libro (PDF/ePub)
- P2: Rigenerazione/modifica singolo capitolo
- P2: Condivisione pubblica del libro

## Note
- Budget Emergent LLM Key esaurito durante i test → ricarica necessaria per nuove generazioni.
