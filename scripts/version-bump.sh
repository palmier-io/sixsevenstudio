#!/bin/bash

set -e

VERSION_TYPE=$1

if [[ -z "$VERSION_TYPE" ]] || [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo "Usage: $0 <patch|minor|major> [--push]"
  exit 1
fi

SHOULD_PUSH=false
if [[ "$2" == "--push" ]]; then
  SHOULD_PUSH=true
fi

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"

# Calculate new version
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]}
MINOR=${VERSION_PARTS[1]}
PATCH=${VERSION_PARTS[2]}

case $VERSION_TYPE in
  major)
    NEW_VERSION="$((MAJOR + 1)).0.0"
    ;;
  minor)
    NEW_VERSION="$MAJOR.$((MINOR + 1)).0"
    ;;
  patch)
    NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
    ;;
esac

echo "Bumping version to: $NEW_VERSION"

# Update package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Update tauri.conf.json
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));
config.version = '$NEW_VERSION';
fs.writeFileSync('src-tauri/tauri.conf.json', JSON.stringify(config, null, 2) + '\n');
"

# Update Cargo.toml
sed -i '' "s/^version = \".*\"/version = \"$NEW_VERSION\"/" src-tauri/Cargo.toml

echo "✓ Updated all version files"

# Stage changes
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml

# Commit
git commit -m "chore: bump version to $NEW_VERSION"

# Create tag
git tag -a "v$NEW_VERSION" -m "Release $NEW_VERSION"

echo ""
echo "✓ Version bumped to $NEW_VERSION"
echo "✓ Tagged as v$NEW_VERSION"

if [[ "$SHOULD_PUSH" == "true" ]]; then
  echo ""
  echo "Pushing changes and tags..."
  git push
  git push --tags
  echo ""
  echo "✓ Pushed to remote"
else
  echo ""
  echo "To push changes and tags, run:"
  echo "  git push && git push --tags"
  echo ""
  echo "Or use --push flag to push automatically:"
  echo "  ./scripts/version-bump.sh $VERSION_TYPE --push"
fi

