# 📦 Publishing Guide — Libroteca

Questa guida spiega come pubblicare il backend su **PyPI** e il frontend su **NPM**.

---

## 🐍 Publishing Backend su PyPI

### 1. Preparazione del Progetto

Assicurati che il backend abbia:

```
backend/
├── setup.py
├── pyproject.toml
├── MANIFEST.in
├── libroteca/
│   ├── __init__.py
│   ├── server.py
│   └── models/
└── requirements.txt
```

### 2. Crea `setup.py`

```python
from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="libroteca-api",
    version="0.1.0",
    author="Alessandro Ledda",
    author_email="alessandro.ledda@tempocasa.com",
    description="FastAPI backend for Libroteca - AI-powered book creator",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/alessandroledda-del/Ebook-creator",
    packages=find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries",
    ],
    python_requires=">=3.9",
    install_requires=[
        "fastapi>=0.95.0",
        "uvicorn[standard]>=0.21.0",
        "motor>=3.1.1",
        "pydantic>=2.0.0",
        "anthropic>=0.7.0",
        "python-multipart>=0.0.5",
        "python-dotenv>=1.0.0",
        "ebooklib>=0.18",
        "pillow>=9.5.0",
        "requests>=2.31.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.3.0",
            "pytest-asyncio>=0.21.0",
            "black>=23.3.0",
            "flake8>=6.0.0",
        ]
    },
)
```

### 3. Crea `pyproject.toml`

```toml
[build-system]
requires = ["setuptools>=65.0", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "libroteca-api"
version = "0.1.0"
description = "FastAPI backend for Libroteca - AI-powered book creator"
readme = "README.md"
requires-python = ">=3.9"
license = {text = "MIT"}
authors = [
    {name = "Alessandro Ledda", email = "alessandro.ledda@tempocasa.com"}
]
keywords = ["ai", "book-generator", "fastapi", "openai", "anthropic"]
classifiers = [
    "Development Status :: 3 - Alpha",
    "Intended Audience :: Developers",
    "License :: OSI Approved :: MIT License",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.9",
    "Programming Language :: Python :: 3.10",
    "Programming Language :: Python :: 3.11",
]
```

### 4. Installa Build Tools

```bash
cd backend
pip install build twine
```

### 5. Buildizza il Progetto

```bash
python -m build
```

Questo crea:
- `dist/libroteca-api-0.1.0.tar.gz` (source distribution)
- `dist/libroteca-api-0.1.0-py3-none-any.whl` (wheel)

### 6. Upload su PyPI

**Test Environment (TestPyPI):**

```bash
twine upload --repository testpypi dist/*
# Ti chiederà username e password (o token)
```

**Production (PyPI):**

```bash
twine upload dist/*
```

**Con API Token (Raccomandato):**

Crea file `~/.pypirc`:

```ini
[distutils]
index-servers =
    pypi

[pypi]
repository = https://upload.pypi.org/legacy/
username = __token__
password = pypi-AgEIcHlwaS5vcmc...
```

Poi:

```bash
twine upload dist/*
```

### 7. Installazione

Una volta pubblicato:

```bash
pip install libroteca-api
```

---

## 📦 Publishing Frontend su NPM

### 1. Configurazione `package.json`

```json
{
  "name": "libroteca-ui",
  "version": "0.1.0",
  "description": "React components library for Libroteca - AI-powered book creator",
  "main": "dist/index.js",
  "module": "dist/index.es.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist",
    "src"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/alessandroledda-del/Ebook-creator.git",
    "directory": "frontend"
  },
  "keywords": [
    "ai",
    "book-generator",
    "react",
    "book",
    "writing",
    "generative-ai"
  ],
  "author": "Alessandro Ledda",
  "license": "MIT",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:lib": "vite build --mode lib",
    "preview": "vite preview",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "framer-motion": "^10.0.0",
    "tailwindcss": "^3.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^4.4.0",
    "typescript": "^5.0.0"
  }
}
```

### 2. Crea `vite.config.ts` per Library

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [react(), dts()],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'LibrotecaUI',
      fileName: (format) => `index.${format === 'es' ? 'es' : 'cjs'}.js`
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
})
```

### 3. Crea Entry Point `src/index.ts`

```typescript
// Export main components
export { CharacterDialog } from './components/CharacterDialog'
export { CoverStudio } from './components/book/CoverStudio'
export { ShareDialog } from './components/book/ShareDialog'
export { default as Header } from './components/Header'

// Export types/contexts
export { useAuth } from './context/AuthContext'
export type { User } from './types/auth'
```

### 4. Build e Publish

```bash
cd frontend

# Build della libreria
npm run build:lib

# Login su NPM
npm login

# Publish
npm publish

# Per beta/alpha
npm publish --tag beta
```

### 5. Installazione

Una volta pubblicato:

```bash
npm install libroteca-ui
```

### Uso:

```typescript
import { CharacterDialog, CoverStudio } from 'libroteca-ui'

export default function App() {
  return (
    <>
      <CharacterDialog />
      <CoverStudio />
    </>
  )
}
```

---

## 🔄 Versioning

Usa **Semantic Versioning** (MAJOR.MINOR.PATCH):

```bash
# Patch (bug fixes): 0.1.0 → 0.1.1
npm version patch

# Minor (new features): 0.1.0 → 0.2.0
npm version minor

# Major (breaking changes): 0.1.0 → 1.0.0
npm version major
```

---

## 🔐 Token API

### PyPI Token

1. Vai su https://pypi.org/account/
2. Crea **API Token**
3. Salva in `~/.pypirc`

### NPM Token

```bash
npm adduser
# o
npm login
```

Token salvato in `~/.npmrc`

---

## ✅ Checklist Publishing

- [ ] Update version in `setup.py` e `package.json`
- [ ] Update CHANGELOG.md
- [ ] Test build locally
- [ ] Push a GitHub
- [ ] Tag release su GitHub (`git tag v0.1.0`)
- [ ] Build distribuzione
- [ ] Upload su PyPI/NPM
- [ ] Verifica installazione
- [ ] Aggiorna badge nel README

---

## 🚀 GitHub Actions (Opzionale)

Automatizza il publish con `.github/workflows/publish.yml`:

```yaml
name: Publish to PyPI and NPM

on:
  release:
    types: [published]

jobs:
  publish-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      - run: pip install build twine
      - run: cd backend && python -m build
      - run: twine upload backend/dist/* -u __token__ -p ${{ secrets.PYPI_TOKEN }}

  publish-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: cd frontend && npm ci && npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

**Happy Publishing! 🚀**
