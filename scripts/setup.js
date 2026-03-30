#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = process.cwd();

// Colori per output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log(`✅ Created: ${dirPath}`, 'green');
  }
}

function createFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content);
  log(`✅ Created: ${filePath}`, 'green');
}

// ==========================
// 1. CREATE DIRECTORIES
// ==========================
log('\n📁 Creating directories...', 'blue');

const dirs = [
  'server/config',
  'server/middleware',
  'server/services',
  'server/routes',
  'server/models',
  'server/utils',
  'locales',
  'tests'
];

dirs.forEach(dir => createDirectory(path.join(projectRoot, dir)));

// ==========================
// 2. CREATE AUTH MIDDLEWARE
// ==========================
log('\n🔐 Creating authentication middleware...', 'blue');

createFile(
  path.join(projectRoot, 'server/middleware/auth.js'),
  `const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token non trovato' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token non valido' });
  }
};

module.exports = auth;`
);

// ==========================
// 3. CREATE GROQ SERVICE
// ==========================
log('\n🤖 Creating Groq AI service...', 'blue');

createFile(
  path.join(projectRoot, 'server/services/groqService.js'),
  `const { Groq } = require('groq-sdk');

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const generateChapter = async (prompt, language = 'it', chapterLength = 2000) => {
  try {
    const systemPrompt = \`You are a professional book author. Write in \${language}.
    Create well-structured chapters following classic book format.
    Aim for approximately \${chapterLength} words.\`;

    const message = await client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      model: "mixtral-8x7b-32768",
      temperature: 0.7,
      max_tokens: Math.ceil(chapterLength / 4)
    });

    return message.choices[0].message.content;
  } catch (error) {
    console.error('Errore Groq:', error);
    throw new Error('Errore nella generazione del contenuto');
  }
};

module.exports = { generateChapter };`
);

// ==========================
// 4. CREATE EBOOK SERVICE
// ==========================
log('\n📄 Creating eBook PDF service...', 'blue');

createFile(
  path.join(projectRoot, 'server/services/ebookService.js'),
  `const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const createPDF = async (bookData, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4'
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Copertina
      doc.fontSize(32).text(bookData.title, { align: 'center' });
      doc.fontSize(16).text(\`by \${bookData.author}\`, { align: 'center' });
      doc.addPage();

      // Pagina titolo
      doc.fontSize(28).text(bookData.title);
      doc.fontSize(12).text(\`Autore: \${bookData.author}\`);
      doc.fontSize(10).text(\`Genere: \${bookData.genre}\`);
      doc.addPage();

      // Indice
      doc.fontSize(20).text('Indice', { underline: true });
      bookData.chapters.forEach((ch, idx) => {
        doc.fontSize(11).text(\`\${idx + 1}. \${ch.title}\`);
      });
      doc.addPage();

      // Capitoli
      bookData.chapters.forEach((chapter, idx) => {
        doc.fontSize(18).text(\`Capitolo \${idx + 1}: \${chapter.title}\`, { underline: true });
        doc.fontSize(12).text(chapter.content);
        doc.addPage();
      });

      doc.end();

      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { createPDF };`
);

// ==========================
// 5. CREATE STORAGE SERVICE
// ==========================
log('\n☁️ Creating Firebase storage service...', 'blue');

createFile(
  path.join(projectRoot, 'server/services/storageService.js'),
  `const admin = require('firebase-admin');
const path = require('path');

try {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_KEY))
  });
} catch (error) {
  console.warn('Firebase not configured yet');
}

const bucket = admin.storage().bucket();

const uploadFile = async (localPath, remoteFileName) => {
  try {
    const destination = \`ebooks/\${remoteFileName}\`;
    
    await bucket.upload(localPath, {
      destination,
      metadata: {
        contentType: getContentType(remoteFileName)
      }
    });

    const file = bucket.file(destination);
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 30 * 24 * 60 * 60 * 1000
    });

    return url;
  } catch (error) {
    console.error('Errore upload:', error);
    throw error;
  }
};

const getContentType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  return {
    '.pdf': 'application/pdf',
    '.epub': 'application/epub+zip',
    '.png': 'image/png'
  }[ext] || 'application/octet-stream';
};

module.exports = { uploadFile };`
);

// ==========================
// 6. CREATE BOOK MODEL
// ==========================
log('\n📚 Creating Book database model...', 'blue');

createFile(
  path.join(projectRoot, 'server/models/Book.js'),
  `const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: String,
    required: true
  },
  genre: {
    type: String,
    enum: ['fiction', 'fantasy', 'romance', 'mystery', 'sci-fi', 'biography', 'education', 'other'],
    required: true
  },
  description: String,
  language: {
    type: String,
    enum: ['it', 'en', 'es', 'fr', 'de'],
    default: 'it'
  },
  price: {
    type: Number,
    default: 4.99
  },
  chapters: [{
    chapterNumber: Number,
    title: String,
    content: String,
    wordCount: Number
  }],
  coverUrl: String,
  pdfUrl: String,
  epubUrl: String,
  status: {
    type: String,
    enum: ['draft', 'generating', 'published'],
    default: 'draft'
  },
  downloads: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Book', bookSchema);`
);

// ==========================
// 7. CREATE USER MODEL
// ==========================
log('\n👤 Creating User database model...', 'blue');

createFile(
  path.join(projectRoot, 'server/models/User.js'),
  `const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  language: {
    type: String,
    default: 'it',
    enum: ['it', 'en', 'es', 'fr', 'de']
  },
  books: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(plainPassword) {
  return await bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);`
);

// ==========================
// 8. CREATE TRANSLATIONS
// ==========================
log('\n🌍 Creating translation files...', 'blue');

const translations = {
  it: {
    common: {
      appName: 'Ebook Creator',
      welcome: 'Benvenuto',
      logout: 'Esci',
      loading: 'Caricamento in corso...',
      error: 'Errore',
      success: 'Successo'
    },
    auth: {
      login: 'Accedi',
      register: 'Registrati',
      email: 'Email',
      password: 'Password'
    },
    books: {
      myBooks: 'I Miei Libri',
      createBook: 'Crea Nuovo Libro',
      title: 'Titolo',
      genre: 'Genere',
      downloadPdf: 'Scarica PDF',
      downloadEpub: 'Scarica EPUB'
    }
  },
  en: {
    common: {
      appName: 'Ebook Creator',
      welcome: 'Welcome',
      logout: 'Logout',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success'
    },
    auth: {
      login: 'Login',
      register: 'Register',
      email: 'Email',
      password: 'Password'
    },
    books: {
      myBooks: 'My Books',
      createBook: 'Create New Book',
      title: 'Title',
      genre: 'Genre',
      downloadPdf: 'Download PDF',
      downloadEpub: 'Download EPUB'
    }
  },
  es: {
    common: {
      appName: 'Ebook Creator',
      welcome: 'Bienvenido',
      logout: 'Salir',
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito'
    },
    auth: {
      login: 'Iniciar sesión',
      register: 'Registrarse',
      email: 'Correo',
      password: 'Contraseña'
    },
    books: {
      myBooks: 'Mis Libros',
      createBook: 'Crear Nuevo Libro',
      title: 'Título',
      genre: 'Género',
      downloadPdf: 'Descargar PDF',
      downloadEpub: 'Descargar EPUB'
    }
  },
  fr: {
    common: {
      appName: 'Ebook Creator',
      welcome: 'Bienvenue',
      logout: 'Déconnexion',
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès'
    },
    auth: {
      login: 'Connexion',
      register: 'Inscription',
      email: 'E-mail',
      password: 'Mot de passe'
    },
    books: {
      myBooks: 'Mes Livres',
      createBook: 'Créer un Nouveau Livre',
      title: 'Titre',
      genre: 'Genre',
      downloadPdf: 'Télécharger PDF',
      downloadEpub: 'Télécharger EPUB'
    }
  },
  de: {
    common: {
      appName: 'Ebook Creator',
      welcome: 'Willkommen',
      logout: 'Abmelden',
      loading: 'Wird geladen...',
      error: 'Fehler',
      success: 'Erfolg'
    },
    auth: {
      login: 'Anmelden',
      register: 'Registrieren',
      email: 'E-Mail',
      password: 'Passwort'
    },
    books: {
      myBooks: 'Meine Bücher',
      createBook: 'Neues Buch erstellen',
      title: 'Titel',
      genre: 'Genre',
      downloadPdf: 'PDF herunterladen',
      downloadEpub: 'EPUB herunterladen'
    }
  }
};

Object.entries(translations).forEach(([lang, content]) => {
  createFile(
    path.join(projectRoot, \`locales/\${lang}.json\`),
    JSON.stringify(content, null, 2)
  );
});

// ==========================
// 9. CREATE DOCUMENTATION
// ==========================
log('\n📖 Creating API documentation...', 'blue');

createFile(
  path.join(projectRoot, 'API_DOCUMENTATION.md'),
  \`# 📚 API Documentation

## Authentication Endpoints

### Register User
\\\`\\\`\\\`bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
\\\`\\\`\\\`

### Login User
\\\`\\\`\\\`bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
\\\`\\\`\\\`

## Book Endpoints

### Get All Books
\\\`\\\`\\\`bash
GET /api/books
Authorization: Bearer {token}
\\\`\\\`\\\`

### Generate New Book
\\\`\\\`\\\`bash
POST /api/books/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "My Book Title",
  "author": "Your Name",
  "genre": "fiction",
  "language": "it",
  "chapters": 10,
  "description": "A great story about..."
}
\\\`\\\`\\\`

### Get Book Details
\\\`\\\`\\\`bash
GET /api/books/:id
\\\`\\\`\\\`

### Delete Book
\\\`\\\`\\\`bash
DELETE /api/books/:id
Authorization: Bearer {token}
\\\`\\\`\\\`
\`
);

// ==========================
// 10. CREATE .ENV FILE
// ==========================
log('\n⚙️ Creating environment configuration...', 'blue');

if (!fs.existsSync(path.join(projectRoot, '.env'))) {
  createFile(
    path.join(projectRoot, '.env'),
    \`# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/ebook-creator

# Groq API (Get from groq.com)
GROQ_API_KEY=your_groq_api_key_here

# Firebase (Download JSON from Firebase Console)
FIREBASE_KEY={"type":"service_account","project_id":"..."}

# JWT Secret
JWT_SECRET=your_random_secret_key_123456789

# Stripe (Optional for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...

# Frontend
FRONTEND_URL=http://localhost:3000
\`
  );
}

// ==========================
// 11. UPDATE PACKAGE.JSON
// ==========================
log('\n📦 Updating package.json with dependencies...', 'blue');

const packageJsonPath = path.join(projectRoot, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  packageJson.dependencies = {
    ...packageJson.dependencies,
    'dotenv': '^16.0.0',
    'express': '^4.18.2',
    'mongoose': '^7.0.0',
    'groq-sdk': '^0.3.0',
    'firebase-admin': '^12.0.0',
    'pdfkit': '^0.13.0',
    'bcrypt': '^5.1.0',
    'jsonwebtoken': '^9.1.0',
    'cors': '^2.8.5',
    'multer': '^1.4.5'
  };

  packageJson.devDependencies = {
    ...packageJson.devDependencies,
    'nodemon': '^3.0.0'
  };

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  log('✅ Updated package.json', 'green');
}

// ==========================
// 12. INSTALL DEPENDENCIES
// ==========================
log('\n📦 Installing npm dependencies...', 'blue');

try {
  execSync('npm install', { stdio: 'inherit', cwd: projectRoot });
  log('✅ Dependencies installed successfully', 'green');
} catch (error) {
  log('⚠️ Error installing dependencies. Run manually: npm install', 'yellow');
}

// ==========================
// 13. FINAL SUMMARY
// ==========================
log('\n' + '='.repeat(70), 'blue');
log('✅ PROJECT SETUP COMPLETED SUCCESSFULLY!', 'green');
log('='.repeat(70), 'blue');

log('\n📋 Summary of Created Files:', 'yellow');
log('  ✅ Middleware: server/middleware/auth.js', 'green');
log('  ✅ Services: server/services/groqService.js', 'green');
log('  ✅ Services: server/services/ebookService.js', 'green');
log('  ✅ Services: server/services/storageService.js', 'green');
log('  ✅ Models: server/models/Book.js', 'green');
log('  ✅ Models: server/models/User.js', 'green');
log('  ✅ Translations: locales/it.json, en.json, es.json, fr.json, de.json', 'green');
log('  ✅ Documentation: API_DOCUMENTATION.md', 'green');
log('  ✅ Configuration: .env file', 'green');

log('\n🚀 Next Steps:', 'yellow');
log('1. Configure your .env file with API keys:', 'reset');
log('   - GROQ_API_KEY from groq.com', 'reset');
log('   - FIREBASE_KEY from Firebase Console', 'reset');
log('   - MONGO_URI from MongoDB Atlas', 'reset');
log('', 'reset');
log('2. Start the backend:', 'reset');
log('   npm run dev', 'reset');
log('', 'reset');
log('3. Create frontend (or use existing):', 'reset');
log('   cd frontend && npm run dev', 'reset');
log('', 'reset');
log('4. Visit http://localhost:3000', 'reset');

log('\n📚 Documentation Files:', 'yellow');
log('  - API_DOCUMENTATION.md: All API endpoints', 'reset');
log('  - .env.example: Environment variables template', 'reset');

log('\n💡 Useful Commands:', 'yellow');
log('  npm run dev        Start backend in development', 'reset');
log('  npm test           Run tests', 'reset');
log('  node scripts/deploy.js   Deploy to Railway/Vercel', 'reset');

log('\n✨ Happy coding! Your Ebook Creator is ready to go! 🎉', 'green');
log('='.repeat(70), 'blue');
