# 📖 Libroteca — AI-Powered Book Creator

Trasforma le tue idee in libri completi con l'intelligenza artificiale. **Libroteca** è una piattaforma full-stack che genera automaticamente trame, capitoli, personaggi e copertine in italiano, usando i migliori LLM disponibili.

![JavaScript](https://img.shields.io/badge/JavaScript-68.6%25-F7DF1E?style=flat-square)
![Python](https://img.shields.io/badge/Python-27.2%25-3776AB?style=flat-square)
![React](https://img.shields.io/badge/React-Component--Based-61DAFB?style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-API--Backend-009688?style=flat-square)

---

## 🎯 Cosa Puoi Fare

- **📝 Genera Libri Completi**: Da un'idea semplice a un libro con trama, capitoli e personaggi
- **🎨 Copertine Professionali**: AI-powered cover design con Gemini e GPT Image
- **👥 Personaggi Su Misura**: Crea personaggi con nomi, caratteristiche, abilità e visual
- **📚 Esporta in PDF & EPUB**: Scarica i tuoi libri in formati standard
- **🔗 Condividi Pubblicamente**: Crea link pubblici per far leggere i tuoi libri
- **📖 Serie & Sequels**: Genera continuazioni che mantengono continuità con il volume precedente

---

## 🏗️ Stack Tecnologico

### Frontend
- **React** (68.6%) — UI interattiva con Framer Motion
- **Tailwind CSS** — Styling moderno e responsive
- **Shadcn UI** — Componenti accessibility-first
- **Vite** — Build veloce e HMR

### Backend
- **FastAPI** (Python 27.2%) — API REST asincrona e veloce
- **MongoDB** — Database NoSQL per libri, capitoli, personaggi
- **Streaming Responses** — Export PDF e EPUB in real-time

### AI & Generazione Contenuti
- **Claude Sonnet 4.5** — Generazione testo e trame
- **Gemini Nano Banana** — Generazione copertine da prompt
- **GPT Image 1** — Ritratti AI per i personaggi
- **Google OAuth** — Autenticazione sicura

---

## 🚀 Quick Start

### Prerequisiti
- Node.js 18+
- Python 3.9+
- MongoDB Atlas (o locale)
- API keys: Anthropic (Claude), Google (OAuth)

### Instalazione Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # su Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configura .env
cp .env.example .env
# Aggiungi: MONGO_URI, ANTHROPIC_API_KEY, GOOGLE_CLIENT_ID, etc.

python -m server
# API live su http://localhost:8000
```

### Instalazione Frontend

```bash
cd frontend
npm install
npm run dev
# App live su http://localhost:3000
```

---

## 📋 Flusso di Creazione

1. **Inserisci l'idea** — Descrivi la trama del tuo libro
2. **Scegli i parametri** — Genere, tono, lunghezza capitoli, POV
3. **Crea personaggi** — Nomi, abilità, debolezze (opzionale)
4. **Genera trama** — L'AI crea titolo, sinossi, outline capitoli
5. **Scrivi capitoli** — Generazione parallela di ogni capitolo
6. **Personalizza copertina** — AI-generated o carica immagine guida
7. **Esporta & Condividi** — PDF, EPUB o link pubblico

---

## 🛠️ Funzionalità Principali

### Creazione Libri
- Generazione automatica di trama e capitoli
- Supporto serie (sequels con continuità narrativa)
- Parametri customizzabili: genere, tono, lunghezza, POV

### Gestione Personaggi
- Creazione avanzata con ritratti AI
- Caratterizzazione automatica (forze, debolezze, abilità)
- Integrazione nel flusso narrativo

### Studio Copertina
- Editor visuale drag-and-drop
- Generazione AI con Gemini/GPT
- Template professionali pre-disegnati

### Export & Distribuzione
- **PDF**: Layout ottimizzato con metadati
- **EPUB**: Formato standard per e-reader
- **Link Pubblico**: Condividi e leggi online
- **Metadata**: Supporto ISBN, autore, genere

---

## 📁 Struttura Progetto

```
Ebook-creator/
├── frontend/                 # React app
│   ├── src/pages/           # CreateBook, BookView, PublicBook
│   ├── src/components/      # CharacterDialog, CoverStudio, ShareDialog
│   ├── src/context/         # AuthContext, hooks
│   └── public/
├── backend/                  # FastAPI server
│   ├── server.py            # Routes e logica principale
│   ├── requirements.txt
│   └── models/              # Pydantic models
├── memory/                   # Documentazione interna (PRD, specs)
├── tests/                    # Test suite
└── design_guidelines.json    # Brand & design tokens
```

---

## 🔐 Autenticazione

- **Google OAuth 2.0** — Login via Google Account
- **Sessions HTTP-Only** — Sicurezza CSRF built-in
- **JWT alternativo** — Opzionale per API client

---

## 📊 Variabili di Ambiente

```env
# Backend
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/libroteca
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
FRONTEND_URL=http://localhost:3000

# Frontend
VITE_API_URL=http://localhost:8000
```

---

## 🧪 Testing

```bash
cd frontend
npm test

cd backend
pytest tests/
```

---

## 🤝 Contribuire

Le contribuzioni sono benvenute! 

1. Fork il repo
2. Crea un branch (`git checkout -b feature/amazing-feature`)
3. Commit (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Apri una Pull Request

---

## 📄 Licenza

Questo progetto è rilasciato sotto la **MIT License** — vedi il file [LICENSE](LICENSE) per i dettagli.

Liberamente modificabile e utilizzabile per progetti personali e commerciali.

---

## 🌟 Roadmap

- [ ] Supporto multilingue (EN, ES, FR)
- [ ] Marketplace di template narrativi
- [ ] Collaborazione in tempo reale (più autori)
- [ ] Plugin Markdown per editor custom
- [ ] Integrazione KDP (Amazon Kindle Direct Publishing)
- [ ] Analytics per statistiche letture

---

## 💡 Ispirazioni & Crediti

- **Framer Motion** — Animazioni fluide
- **Shadcn UI** — Componenti accessible
- **Claude AI** — Generazione testo top-tier
- **EPUB Standard** — Formato universale

---

## 📞 Support

- 📧 Apri un'Issue su GitHub
- 🐛 Segnala bug dettagliati
- 💬 Discussioni per feature requests

---

**Trasforma le tue idee in realtà letteraria.** ✨📖
