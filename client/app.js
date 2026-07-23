// 📚 Ebook Creator Frontend - Application JavaScript

const API_URL = '/api';
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + authToken
    };
}

function resetRegisterForm() {
    const nameField = document.getElementById('registerName');
    const emailField = document.getElementById('registerEmail');
    const passwordField = document.getElementById('registerPassword');

    if (nameField) nameField.value = '';
    if (emailField) emailField.value = '';
    if (passwordField) passwordField.value = '';
}

function escapeHtml(value) {
    const raw = String(value ?? '');
    return raw
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function sanitizeBookId(value) {
    const raw = String(value ?? '');
    return /^[a-zA-Z0-9_-]+$/.test(raw) ? raw : '';
}

// ========== NOTIFICATION ==========
function showNotification(message, type = 'success') {
    const el = document.getElementById('notification');
    if (!el) return;
    el.textContent = message;
    el.className = type;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// ========== UPDATE AUTH UI ==========
function updateAuthUI() {
    const bookSection = document.getElementById('bookSection');
    const logoutBtn = document.getElementById('logoutBtn');
    const authStatus = document.getElementById('authStatus');

    if (authToken && currentUser) {
        if (bookSection) bookSection.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (authStatus) authStatus.textContent = `Connesso come: ${currentUser.name} (${currentUser.email})`;
    } else {
        if (bookSection) bookSection.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (authStatus) authStatus.textContent = '';
    }
}

// ========== REGISTER ==========
async function register() {
    const name = document.getElementById('registerName')?.value?.trim();
    const email = document.getElementById('registerEmail')?.value?.trim();
    const password = document.getElementById('registerPassword')?.value;

    if (!name || !email || !password) {
        showNotification('❌ Nome, email e password sono obbligatori', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            resetRegisterForm();
            showNotification(`✅ Benvenuto ${data.user.name}!`);
            updateAuthUI();
            loadBooks();
        } else {
            showNotification(`❌ ${data.message}`, 'error');
        }
    } catch (error) {
        showNotification(`❌ Errore registrazione: ${error.message}`, 'error');
        console.error(error);
    }
}

// ========== LOGIN ==========
async function login() {
    const email = document.getElementById('loginEmail')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value;

    if (!email || !password) {
        showNotification('❌ Email e password sono obbligatori', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showNotification(`✅ Benvenuto ${data.user.name}!`);
            updateAuthUI();
            loadBooks();
        } else {
            showNotification(`❌ ${data.message}`, 'error');
        }
    } catch (error) {
        showNotification(`❌ Errore login: ${error.message}`, 'error');
        console.error(error);
    }
}

// ========== CREATE BOOK ==========
async function createBook() {
    const title = document.getElementById('bookTitle')?.value?.trim();
    const author = document.getElementById('bookAuthor')?.value?.trim();
    const price = parseFloat(document.getElementById('bookPrice')?.value);
    const genre = document.getElementById('bookGenre')?.value?.trim();

    if (!title || !author || isNaN(price)) {
        showNotification('❌ Titolo, autore e prezzo sono obbligatori', 'error');
        return;
    }

    if (!authToken) {
        showNotification('❌ Devi effettuare il login prima', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/books`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ title, author, price, genre })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification(`✅ Libro "${title}" creato con successo!`);
            document.getElementById('bookTitle').value = '';
            document.getElementById('bookAuthor').value = '';
            document.getElementById('bookPrice').value = '';
            document.getElementById('bookGenre').value = '';
            loadBooks();
        } else {
            showNotification(`❌ ${data.error}`, 'error');
        }
    } catch (error) {
        showNotification(`❌ Errore creazione libro: ${error.message}`, 'error');
        console.error(error);
    }
}

// ========== LOAD BOOKS ==========
async function loadBooks() {
    try {
        const response = await fetch(`${API_URL}/books`);
        const data = await response.json();

        const booksList = document.getElementById('booksList');
        if (!booksList) return;

        const books = data.books || [];

        if (books.length === 0) {
            booksList.innerHTML = '<p>Nessun libro trovato.</p>';
            return;
        }

        booksList.innerHTML = '';
        books.forEach((book) => {
            const isOwner = currentUser && book.userId && (
                (typeof book.userId === 'string' ? book.userId : book.userId._id || book.userId.id) === currentUser.id
            );

            const bookDiv = document.createElement('div');
            bookDiv.className = 'book-item';
            bookDiv.innerHTML = `
                <h3>${escapeHtml(book.title)}</h3>
                <p><strong>Autore:</strong> ${escapeHtml(book.author)}</p>
                <p><strong>Prezzo:</strong> €${(book.price || 0).toFixed(2)}</p>
                <p><strong>Stato:</strong> ${escapeHtml(book.status || '-')}</p>
                <p>${escapeHtml(book.description || '')}</p>
            `;

            if (isOwner) {
                const safeBookId = sanitizeBookId(book._id);
                if (safeBookId) {
                    const actionsDiv = document.createElement('div');
                    actionsDiv.className = 'book-actions';

                    const editButton = document.createElement('button');
                    editButton.className = 'btn-edit';
                    editButton.textContent = '✏️ Modifica';
                    editButton.dataset.action = 'edit';
                    editButton.dataset.bookId = safeBookId;

                    const deleteButton = document.createElement('button');
                    deleteButton.className = 'btn-delete';
                    deleteButton.textContent = '🗑️ Elimina';
                    deleteButton.dataset.action = 'delete';
                    deleteButton.dataset.bookId = safeBookId;

                    actionsDiv.appendChild(editButton);
                    actionsDiv.appendChild(deleteButton);
                    bookDiv.appendChild(actionsDiv);
                }
            }

            booksList.appendChild(bookDiv);
        });
    } catch (error) {
        console.error('❌ Errore caricamento libri:', error);
    }
}

// ========== EDIT BOOK ==========
async function editBook(bookId) {
    const newTitle = window.prompt('📖 Nuovo titolo:');
    const newAuthor = window.prompt('✍️  Nuovo autore:');

    if (!newTitle || !newAuthor) return;

    try {
        const response = await fetch(`${API_URL}/books/${bookId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ title: newTitle, author: newAuthor })
        });

        if (response.ok) {
            showNotification('✅ Libro aggiornato!');
            loadBooks();
        } else {
            const data = await response.json();
            showNotification(`❌ ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('❌ Errore:', error);
    }
}

// ========== DELETE BOOK ==========
async function deleteBook(bookId) {
    if (!window.confirm('Sei sicuro di voler eliminare questo libro?')) return;

    try {
        const response = await fetch(`${API_URL}/books/${bookId}`, {
            method: 'DELETE',
            headers: { Authorization: 'Bearer ' + authToken }
        });

        if (response.ok) {
            showNotification('✅ Libro eliminato!');
            loadBooks();
        } else {
            const data = await response.json();
            showNotification(`❌ ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('❌ Errore:', error);
    }
}

// ========== LOGOUT ==========
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;
    showNotification('✅ Logout effettuato');
    updateAuthUI();
    loadBooks();
}

// ========== INITIALIZE APP ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Ebook Creator app avviata');

    const booksList = document.getElementById('booksList');
    if (booksList) {
        booksList.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-action][data-book-id]');
            if (!button) return;

            const { action, bookId } = button.dataset;
            if (!bookId) return;

            if (action === 'edit') {
                editBook(bookId);
            } else if (action === 'delete') {
                deleteBook(bookId);
            }
        });
    }

    updateAuthUI();
    loadBooks();
});
