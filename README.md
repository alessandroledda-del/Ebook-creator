# Ebook Creator

## Struttura del Progetto
Il progetto Ebook Creator è organizzato nella seguente struttura:

```
Ebook-creator/
├── src/                  # Codice sorgente
│   ├── components/       # Componenti dell'interfaccia utente
│   ├── services/         # Servizi per la gestione delle API
│   └── utils/            # Funzioni di utilità
├── tests/                # Test dell'applicazione
├── package.json          # Dettagli del progetto e dipendenze
└── README.md             # Documentazione del progetto
``` 

## Installazione
Per installare il progetto, seguire questi passaggi:
1. Clone il repository:
   ```bash
   git clone https://github.com/alessandroledda-del/Ebook-creator.git
   ```
2. Navigare nella cartella del progetto:
   ```bash
   cd Ebook-creator
   ```
3. Installare le dipendenze:
   ```bash
   npm install
   ```

## Configurazione
Assicurarsi di avere Node.js e npm installati. Dopo aver installato le dipendenze, è possibile configurare le variabili ambientali necessarie creando un file `.env` nella cartella principale. Un esempio di file `.env` è fornito come `.env.example`.

## API Endpoints
| Endpoint               | Metodo  | Descrizione                            |
|-----------------------|---------|---------------------------------------|
| `/api/v1/books`       | GET     | Recupera l'elenco di tutti i libri    |
| `/api/v1/books`       | POST    | Crea un nuovo libro                   |
| `/api/v1/books/:id`   | GET     | Recupera un libro specifico           |
| `/api/v1/books/:id`   | PUT     | Aggiorna un libro specifico           |
| `/api/v1/books/:id`   | DELETE  | Elimina un libro specifico            |

## Utilizzo
Dopo aver configurato l'applicazione, è possibile avviarla eseguendo il seguente comando:
```bash
npm start
```
L'applicazione sarà disponibile su `http://localhost:3000`.
