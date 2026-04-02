// 📚 Ebook Creator Frontend - Application JavaScript

// API Base URL
const API_URL = 'http://localhost:3000/api';
let authToken = localStorage.getItem('authToken');

// ========== LOGIN FUNCTION ==========
async function login() {
    const email = prompt('📧 Inserisci email:');
    const password = prompt('🔐 Inserisci password:');
    
    if (!email || !password) {
        alert('❌ Email e password sono obbligatori');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            alert(`✅ Benvenuto ${data.user.nome}!`);
            loadBooks();
        } else {
            alert(`❌ Errore: ${data.message}`);
        }
    } catch (error) {
        alert(`❌ Errore login: ${error.message}`);
        console.error(error);
    }
}

// ========== CREATE BOOK FUNCTION ==========
async function createBook() {
    const titolo = prompt('📖 Titolo del libro:');
    const autore = prompt('✍️  Autore:');
    const descrizione = prompt('📝 Descrizione:');
    
    if (!titolo || !autore) {
        alert('❌ Titolo e autore sono obbligatori');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/books`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ titolo, autore, descrizione })
        });

        const data = await response.json();
        
        if (response.ok) {
            alert(`✅ Libro "${titolo}" creato con successo!`);
            loadBooks();
        } else {
            alert(`❌ Errore: ${data.error}`);
        }
    } catch (error) {
        alert(`❌ Errore creazione libro: ${error.message}`);
        console.error(error);
    }
}

// ========== LOAD BOOKS FUNCTION ==========
async function loadBooks() {
    try {
        const response = await fetch(`${API_URL}/books`);
        const books = await response.json();
        
        const booksList = document.getElementById('booksList');
        
        if (!booksList) {
            console.log('📚 Libri caricati:', books);
            return;
        }

        booksList.innerHTML = '';
        
        if (books.length === 0) {
            booksList.innerHTML = '<p>Nessun libro trovato</p>';
            return;
        }

        books.forEach(book => {
            const bookDiv = document.createElement('div');
            bookDiv.className = 'book-item';
            bookDiv.innerHTML = `
                <h3>${book.titolo}</h3>
                <p><strong>Autore:</strong> ${book.autore}</p>
                <p><strong>Stato:</strong> ${book.statoCreazione}</p>
                <p>${book.descrizione || 'Nessuna descrizione'}</p>
                <button onclick="editBook('${book._id}')">✏️ Modifica</button>
                <button onclick="deleteBook('${book._id}')">🗑️ Elimina</button>
            `;
            booksList.appendChild(bookDiv);
        });
    } catch (error) {
        console.error('❌ Errore caricamento libri:', error);
    }
}

// ========== EDIT BOOK FUNCTION ==========
async function editBook(bookId) {
    const newTitle = prompt('📖 Nuovo titolo:');
    const newAuthor = prompt('✍️  Nuovo autore:');
    
    if (!newTitle || !newAuthor) return;

    try {
        const response = await fetch(`${API_URL}/books/${bookId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ titolo: newTitle, autore: newAuthor })
        });

        if (response.ok) {
            alert('✅ Libro aggiornato!');
            loadBooks();
        } else {
            alert('❌ Errore aggiornamento');
        }
    } catch (error) {
        console.error('❌ Errore:', error);
    }
}

// ========== DELETE BOOK FUNCTION ==========
async function deleteBook(bookId) {
    if (!confirm('Sei sicuro di voler eliminare questo libro?')) return;

    try {
        const response = await fetch(`${API_URL}/books/${bookId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            alert('✅ Libro eliminato!');
            loadBooks();
        } else {
            alert('❌ Errore eliminazione');
        }
    } catch (error) {
        console.error('❌ Errore:', error);
    }
}

// ========== LOGOUT FUNCTION ==========
function logout() {
    localStorage.removeItem('authToken');
    authToken = null;
    alert('✅ Logout effettuato');
    location.reload();
}

// ========== INITIALIZE APP ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Ebook Creator app avviata');
    if (authToken) {
        loadBooks();
    }
});
