name: Release Checklist Guide

# This file helps maintain consistency when creating releases

## 📋 Pre-Release Checklist

- [ ] All tests passing on `main` branch
- [ ] CHANGELOG.md updated with new version
- [ ] Version numbers updated:
  - [ ] `package.json` (frontend)
  - [ ] `backend/setup.py`
  - [ ] `backend/pyproject.toml`
- [ ] README.md reviewed and updated if needed
- [ ] Documentation up-to-date
- [ ] Security scan completed
- [ ] No console warnings/errors

## 🚀 Release Steps

### 1. Prepare Release Branch
```bash
git checkout main
git pull origin main
```

### 2. Update Version
```bash
# Choose: patch, minor, or major
npm version minor

# This automatically updates package.json and creates a commit
```

### 3. Update Backend Version
Edit `backend/setup.py` and `backend/pyproject.toml`:
```python
version="0.2.0",
```

### 4. Update CHANGELOG.md
Move items from `[Unreleased]` to new version section.

Example:
```markdown
## [0.2.0] - 2026-09-15

### Added
- New feature X
- New feature Y

### Fixed
- Bug fix A
- Bug fix B

### Changed
- Breaking change notice

## [0.1.0] - 2026-08-12
...
```

### 5. Commit Release
```bash
git add CHANGELOG.md backend/setup.py backend/pyproject.toml
git commit -m "chore: release version 0.2.0"
git tag -a v0.2.0 -m "Release v0.2.0"
git push origin main --tags
```

### 6. Create GitHub Release
1. Go to https://github.com/alessandroledda-del/Ebook-creator/releases
2. Click "Draft a new release"
3. Select tag `v0.2.0`
4. Title: `v0.2.0 - Release Title`
5. Copy changelog content to description
6. Click "Publish release"

### 7. Monitor Publishing
- GitHub Actions will automatically:
  - [ ] Create release on GitHub
  - [ ] Build and publish backend to PyPI
  - [ ] Build and publish frontend to NPM
  - [ ] Run all tests
  - [ ] Run security scans

## 📊 Versioning Strategy (SemVer)

- **MAJOR** (0.1.0 → 1.0.0): Breaking changes
- **MINOR** (0.1.0 → 0.2.0): New features (backward compatible)
- **PATCH** (0.1.0 → 0.1.1): Bug fixes

## 🔐 Required Secrets (Settings → Secrets)

Set these in GitHub repository settings:

- `PYPI_TOKEN` - PyPI API token for publishing backend
- `NPM_TOKEN` - NPM token for publishing frontend

## 📝 Changelog Format

```markdown
## [x.y.z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes in existing functionality

### Fixed
- Bug fixes

### Removed
- Deprecated features

### Security
- Security fixes

### Deprecated
- Deprecation notices
```

## 🎯 Branch Protection Rules

Set on `main` branch:

- [ ] Require pull request reviews before merging (1 reviewer)
- [ ] Dismiss stale pull request approvals when new commits are pushed
- [ ] Require branches to be up to date before merging
- [ ] Require status checks to pass before merging:
  - [ ] tests
  - [ ] security-scan
- [ ] Require signed commits
- [ ] Include administrators in restrictions

## 🚨 Emergency Hotfix

For critical bugs on production:

```bash
# Create hotfix from tagged release
git checkout v0.1.0
git checkout -b hotfix/security-issue

# Make fixes
git add .
git commit -m "fix: critical security issue"

# Create patch release
npm version patch
git push origin hotfix/security-issue

# Create PR to main
# After merge, create release with v0.1.1 tag
```

## 📞 Support Channels

- **Issues**: Bug reports and feature requests
- **Discussions**: Questions and ideas
- **Security**: Security vulnerabilities (private)

---

Last updated: 2026-08-12
