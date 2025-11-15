# Deployment Configuration for Image-Mesh

## Environment Variables

### Development
```bash
NODE_ENV=development
VITE_API_URL=http://localhost:5173
VITE_DB_PATH=./data/image-mesh.db
```

### Production
```bash
NODE_ENV=production
VITE_API_URL=./
VITE_DB_PATH=./data/image-mesh.db
```

## Build Configuration

### Platform-Specific Settings

#### Windows
- Target: nsis, portable
- Architecture: x64, ia32
- Installer: NSIS with custom script
- Icon: assets/icon.ico

#### macOS
- Target: dmg, zip
- Architecture: x64, arm64
- Entitlements: assets/entitlements.mac.plist
- Icon: assets/icon.icns

#### Linux
- Target: AppImage, deb, rpm
- Architecture: x64
- Icon: assets/icon.png
- Category: Science

## Distribution Channels

### GitHub Releases
- Automatic releases on git tags
- Asset attachments for all platforms
- Release notes generation

### Direct Download
- Hosted on GitHub Pages
- Version checking mechanism
- Auto-update support

## Security Considerations

### Code Signing
- Windows: Certificate required for distribution
- macOS: Developer ID certificate needed
- Linux: GPG signing for packages

### Notarization
- macOS: Notarization required for distribution
- Automated notarization process in CI/CD

## Update Mechanism

### Auto-Update
- electron-updater integration
- Background update checking
- User notification system

### Manual Updates
- Download from GitHub releases
- Installation instructions
- Migration support

## Deployment Steps

### 1. Preparation
```bash
# Install dependencies
npm ci

# Run tests
npm run test

# Build application
npm run build
```

### 2. Package Creation
```bash
# Create distribution packages
npm run dist

# Verify packages
ls release/
```

### 3. Release
```bash
# Create git tag
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions will handle the rest
```

## CI/CD Pipeline

### GitHub Actions Workflow
- Trigger on tag push
- Multi-platform builds
- Automated testing
- Release creation

### Build Matrix
- Ubuntu: Linux builds
- Windows: Windows builds
- macOS: macOS builds

### Quality Assurance
- Linting checks
- Type checking
- Unit tests
- Integration tests

## Monitoring

### Error Tracking
- Sentry integration
- Crash reporting
- Performance monitoring

### Analytics
- Usage statistics
- Feature adoption
- Error rates

## Rollback Strategy

### Version Management
- Semantic versioning
- Backward compatibility
- Migration scripts

### Emergency Rollback
- Previous version availability
- Database compatibility
- User notification