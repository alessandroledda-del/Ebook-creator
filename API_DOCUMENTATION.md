# API Documentation - Ebook Creator

## Base URL
`http://localhost:3000/api`

## Endpoints

### Users
- `POST /users/register` - Registra nuovo utente
- `POST /users/login` - Login utente
- `GET /users/:id` - Ottieni profilo utente
- `PUT /users/:id` - Aggiorna profilo utente

### Books
- `GET /books` - Lista libri
- `POST /books` - Crea nuovo libro
- `GET /books/:id` - Ottieni libro
- `PUT /books/:id` - Aggiorna libro
- `DELETE /books/:id` - Elimina libro

### Chapters
- `GET /books/:bookId/chapters` - Lista capitoli
- `POST /chapters` - Crea capitolo
- `PUT /chapters/:id` - Aggiorna capitolo
