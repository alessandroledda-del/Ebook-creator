# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Core AI book generation engine with Claude Sonnet 4.5
- Character management system with AI portraits
- PDF and EPUB export functionality
- Public book sharing with generated links
- Book series/sequels support with narrative continuity
- Cover studio with AI generation (Gemini, GPT Image)
- Authentication via Google OAuth
- Full-stack documentation

### Planned
- Multi-language support (EN, ES, FR)
- Book template marketplace
- Real-time collaboration (multiple authors)
- Markdown editor plugins
- Amazon KDP integration
- Reading analytics dashboard

## [0.1.0] - 2026-08-12

### Added
- ✨ Initial public release
- 📝 Comprehensive README with quick start guide
- 📄 MIT License
- 🐍 Backend setup configuration (setup.py, pyproject.toml)
- 📦 Frontend NPM packaging configuration
- 📚 Publishing guide for PyPI and NPM
- 🔗 GitHub star badge
- 🏷️ Repository topics and description
- 💻 Complete tech stack documentation
  - React + Tailwind CSS + Shadcn UI (Frontend)
  - FastAPI + MongoDB (Backend)
  - Claude Sonnet 4.5 + Gemini + GPT Image (AI)
  - Google OAuth (Authentication)

### Features
- 📖 Generate complete books from ideas
- 🎨 AI-powered book covers
- 👥 Character creation and management
- 📚 Export to PDF and EPUB
- 🔗 Public sharing with custom links
- 📊 Series and sequel support
- 🎯 Customizable generation parameters
  - Genre, narrative tone, chapter length
  - Point of view (1st/3rd person)
  - Chapter count (3-8)

---

## How to Release

### 1. Update Version Numbers
```bash
# For patch releases (0.1.0 → 0.1.1)
npm version patch

# For minor releases (0.1.0 → 0.2.0)
npm version minor

# For major releases (0.1.0 → 1.0.0)
npm version major
```

### 2. Update CHANGELOG.md
Move items from `[Unreleased]` to new version section.

### 3. Commit and Tag
```bash
git add CHANGELOG.md package.json backend/setup.py
git commit -m "chore: bump version to 0.2.0"
git tag -a v0.2.0 -m "Release version 0.2.0"
git push origin main --tags
```

### 4. Create GitHub Release
Go to [Releases](https://github.com/alessandroledda-del/Ebook-creator/releases) and create new release with:
- Tag: `v0.2.0`
- Title: `v0.2.0 - Release Title`
- Description: Copy from CHANGELOG.md

### 5. Publish to PyPI and NPM
```bash
# Backend
cd backend
python -m build
twine upload dist/*

# Frontend
cd frontend
npm publish
```

---

## Version History

### v0.1.0 - August 12, 2026
- Initial public release
- Core functionality
- Full documentation

---

## Contributors

- [@alessandroledda-del](https://github.com/alessandroledda-del) - Initial work

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
