#!/bin/bash

# Script to download FFmpeg binaries as Tauri sidecars
# Uses proper Tauri v2 sidecar naming convention

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BINARIES_DIR="$PROJECT_ROOT/src-tauri/binaries"

# Get target triple
TARGET_TRIPLE=$(rustc -Vv | grep host | cut -f2 -d' ')

echo "📦 Downloading FFmpeg binaries as Tauri sidecars..."
echo "🎯 Target triple: $TARGET_TRIPLE"
echo ""

# Create binaries directory
mkdir -p "$BINARIES_DIR"

# Detect platform
if [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLATFORM="linux"
else
    echo "❌ Unsupported platform: $OSTYPE"
    exit 1
fi

echo "🖥️  Platform: $PLATFORM"
echo ""

# Download for macOS
if [[ "$PLATFORM" == "macos" ]]; then
    FFMPEG_NAME="ffmpeg-$TARGET_TRIPLE"
    FFPROBE_NAME="ffprobe-$TARGET_TRIPLE"

    echo "⬇️  Downloading FFmpeg for macOS..."

    # Download FFmpeg
    if [ ! -f "$BINARIES_DIR/$FFMPEG_NAME" ]; then
        curl -L "https://evermeet.cx/ffmpeg/ffmpeg-6.1.zip" -o /tmp/ffmpeg.zip
        unzip -o /tmp/ffmpeg.zip -d /tmp
        mv /tmp/ffmpeg "$BINARIES_DIR/$FFMPEG_NAME"
        chmod +x "$BINARIES_DIR/$FFMPEG_NAME"
        rm /tmp/ffmpeg.zip
        echo "✅ FFmpeg downloaded as: $FFMPEG_NAME"
    else
        echo "ℹ️  $FFMPEG_NAME already exists, skipping"
    fi

    # Download FFprobe
    if [ ! -f "$BINARIES_DIR/$FFPROBE_NAME" ]; then
        curl -L "https://evermeet.cx/ffmpeg/ffprobe-6.1.zip" -o /tmp/ffprobe.zip
        unzip -o /tmp/ffprobe.zip -d /tmp
        mv /tmp/ffprobe "$BINARIES_DIR/$FFPROBE_NAME"
        chmod +x "$BINARIES_DIR/$FFPROBE_NAME"
        rm /tmp/ffprobe.zip
        echo "✅ FFprobe downloaded as: $FFPROBE_NAME"
    else
        echo "ℹ️  $FFPROBE_NAME already exists, skipping"
    fi

    echo ""
    echo "✅ FFmpeg sidecars downloaded successfully!"
    echo ""
    echo "📍 Location: $BINARIES_DIR"
    echo ""
    echo "Binaries:"
    ls -lh "$BINARIES_DIR"
    echo ""
    echo "🔍 Verify architecture:"
    lipo -info "$BINARIES_DIR/$FFMPEG_NAME" 2>/dev/null || file "$BINARIES_DIR/$FFMPEG_NAME"
fi

# Download for Linux
if [[ "$PLATFORM" == "linux" ]]; then
    FFMPEG_NAME="ffmpeg-$TARGET_TRIPLE"
    FFPROBE_NAME="ffprobe-$TARGET_TRIPLE"

    echo "⬇️  Downloading FFmpeg for Linux (static build)..."

    if [ ! -f "$BINARIES_DIR/$FFMPEG_NAME" ]; then
        curl -L "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz" -o /tmp/ffmpeg-linux.tar.xz
        tar -xf /tmp/ffmpeg-linux.tar.xz -C /tmp

        # Find extracted directory
        FFMPEG_DIR=$(find /tmp -maxdepth 1 -type d -name "ffmpeg-*-amd64-static" | head -n 1)

        # Copy and rename
        cp "$FFMPEG_DIR/ffmpeg" "$BINARIES_DIR/$FFMPEG_NAME"
        cp "$FFMPEG_DIR/ffprobe" "$BINARIES_DIR/$FFPROBE_NAME"

        chmod +x "$BINARIES_DIR/$FFMPEG_NAME"
        chmod +x "$BINARIES_DIR/$FFPROBE_NAME"

        # Cleanup
        rm -rf "$FFMPEG_DIR"
        rm /tmp/ffmpeg-linux.tar.xz

        echo "✅ FFmpeg sidecars downloaded successfully!"
    else
        echo "ℹ️  Binaries already exist, skipping"
    fi

    echo ""
    echo "📍 Location: $BINARIES_DIR"
    echo ""
    echo "Binaries:"
    ls -lh "$BINARIES_DIR"
fi

echo ""
echo "🎉 Done! You can now build the app with:"
echo "   npm run tauri build"
echo ""
echo "The FFmpeg binaries will be bundled as Tauri sidecars."
echo ""
echo "ℹ️  Tauri will automatically resolve the correct binary for your platform."
