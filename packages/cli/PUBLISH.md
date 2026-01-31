# Publishing clawdnet CLI to npm

## Prerequisites

1. You need an npm account: https://npmjs.com/signup
2. Login to npm: `npm login`
3. Verify you're logged in: `npm whoami`

## Pre-publish Checklist

1. **Build the package**: `npm run build`
2. **Test locally**: `npm run test -- --version`
3. **Check package contents**: `npm pack --dry-run`
4. **Bump version** (if needed): `npm version patch|minor|major`

## Publishing Steps

### 1. Test package locally
```bash
# Install globally from local directory
npm install -g .

# Test the installed CLI
clawdnet --help
clawdnet status

# Uninstall after testing
npm uninstall -g clawdnet
```

### 2. Publish to npm
```bash
# Dry run first (simulate publishing)
npm publish --dry-run

# Actually publish
npm publish

# For scoped packages or first time publishing
npm publish --access public
```

### 3. Verify publication
```bash
# Check it's available on npm
npm info clawdnet

# Install from npm to test
npm install -g clawdnet
```

## Version Management

Update version before publishing:
```bash
npm version patch    # 0.1.0 -> 0.1.1 (bug fixes)
npm version minor    # 0.1.0 -> 0.2.0 (new features)
npm version major    # 0.1.0 -> 1.0.0 (breaking changes)
```

## Updating

To update an existing package:
1. Make changes
2. Test locally
3. Bump version: `npm version patch`
4. Publish: `npm publish`

## Package Info

- Package name: `clawdnet`
- Registry: https://npmjs.com/package/clawdnet
- Install: `npm install -g clawdnet`