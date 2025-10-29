# What is sixsevenstudio?

sixsevenstudio is a native desktop app for generating and editing AI videos with Sora.

It lets you brainstorm ideas and storyboards with AI assistant, iterate on Sora videos, and edit the videos, all in one place.

It's built with Tauri, React, Vite, TypeScript, TanStack Query, and a local disk storage.

Key features:
- Bring your own OpenAI API key
- Storyboard AI assistant
- Local storage
- Basic video editing (trimming, stitching, transitions)


### Development

```bash
# TypeScript check + Vite build for production
npm run build

# TypeScript type checking (run automatically during build)
npx tsc --noEmit

# Rust format in src-tauri
cargo fmt
```

## Architecture Overview

### High-Level Structure

```
Desktop App (Tauri)
├── Frontend Layer (React + TypeScript)
│   ├── Pages (Home, ProjectPage)
│   ├── Components (UI, Editor, Chat, Storyboard, Videos)
│   ├── Hooks (Business logic, Tauri IPC wrappers)
│   ├── State Management (Zustand stores, React Query)
│   └── AI Integration (Vercel AI SDK)
│
├── IPC Bridge (Tauri invoke)
│
└── Backend Layer (Rust)
    ├── Commands (File system, video, projects, API keys)
    ├── FFmpeg Integration (video processing)
    └── File System Management (project persistence)
```

### Core Concepts

#### 1. **Project Structure (Disk Persistence)**

Projects are stored hierarchically under `~/sixsevenstudio/`:
```
<project_name>/
├── .sixseven/
│   ├── metadata.json
│   └── editor_state.json
├── images/
│   └── scene_*_reference.jpg
├── videos/
│   └── <video_id>.mp4
└── storyboard/
    ├── context.md
    └── scenes/
        ├── index.json
        ├── <scene_id>/
        │   └── scene.md
        ├── <scene_id>/
        │   └── scene.md
        └── ...
```

#### 2. **Key files/folders**

1. src-tauri/src/lib.rs - list of all tauri commands
2. src-tauri/src/commands/video_editor - module to interact with ffmpeg for video editing
3. src-tauri/src/commands/projects - module to interact with filesystem to store project data
4. src/App.tsx - Tauri frontend entry point
5. src/lib/ai-sdk.ts - prompt and tools for ai assistant
6. src/lib/openai/ - openai client to videos/images endpoints. using API key stored in Tauri from user.
7. src/hooks/tauri/ - hooks wrapper on Tauri IPC
8. src/components/ - React components (ui, chat, editor, storyboard, videos, tabs)
9. src/pages/ - Top-level page components (Home, ProjectPage)
10. src/tabs/ - Tabs inside project page (Storyboard, Videos, Editor)


#### 3. **AI Integration Architecture**

**Two-Tier System:**

**Tier 1: Video Generation (Sora 2)**
- OpenAI SDK for API calls
- Status polling via `useVideoStatusStore` (src/stores/)
- Video download and caching
- Support for remixing existing videos

**Tier 2: Storyboard Assistant (GPT-4/GPT-5)**
- Vercel AI SDK for streaming LLM responses
- System prompt: `src/lib/ai-sdk.ts` (detailed guidelines, tool definitions)
- Tool-based approach for scene operations
- Streaming responses via `useChat()` hook
- Model selection: gpt-4.1-mini (fast), gpt-5-mini (auto), gpt-5 (thinking)

#### 4. **State Management Strategy**

| Strategy | Usage | Location |
|----------|-------|----------|
| **Zustand** | Video polling state | `src/stores/useVideoStatusStore.ts` |
| **React Query** | Server state, caching | `src/hooks/use-*.ts` |
| **URL params** | Navigation/tab state | React Router |
| **Component state** | UI state (forms, inputs) | Within components |

#### 5. **FFmpeg Integration**

- Bundled executable in `src-tauri/binaries/`
- Backend commands: `create_preview_video`, `export_video`
- Used for: preview generation, video composition, final export
- Cross-platform (Mac, Windows, Linux)

#### 6. **Rich Text Editing**

- TipTap editor for scene descriptions and context
- Markdown-like interface
- Text alignment support
- WYSIWYG editing for better UX

#### 7. **UI**
- Use shadcn in src/components/ui
- App.css uses Tailwind v4

### Data Flow Examples

#### Creating a New Scene (with AI)

```
1. User inputs scene prompt in ChatMessages
2. Frontend sends to useChat() (Vercel AI SDK)
3. LLM processes with system prompt (ai-sdk.ts)
4. LLM uses "create_scene" tool
5. Tool writes scene to project/scenes/scene-N.md (backend command)
6. Frontend receives response, updates scene list
7. Scene appears in StoryboardTab
```

#### Generating a Video

```
1. User creates scene with image + prompt
2. Frontend calls OpenAI Sora API via openai.beta.videoGenerations.create()
3. Async polling: useVideoStatusStore polls status every 15 seconds
4. When ready, download video to project/videos/
5. Update project metadata with video reference
6. Display in VideosTab with preview options
```

#### Exporting Timeline

```
1. User selects clips in VideoEditorTab
2. Saves editor_state.json via backend command
3. Frontend sends export request with clips + transitions
4. Backend runs FFmpeg to compose clips
5. Outputs final video file
6. Backend handles progress reporting
```

## Coding Style
- Typescript formatting: 4-space indentation, Prettier formatting
- Rust formatting: `cargo fmt`
- Typescript: Do not use `any`
- Only write comments when the code is unclear, which should not be often. Clean and readable code should be self-explanatory.

---
# Tauri Full Documentation

> Tauri is a framework for building tiny, fast binaries for all major desktop and mobile platforms. Developers can integrate any frontend framework that compiles to HTML, JavaScript, and CSS for building their user experience while leveraging languages such as Rust, Swift, and Kotlin for backend logic when needed.

This index links to documentation that covers everything from getting started to advanced concepts, and distribution of Tauri applications.

The index is organized into key sections:
- **start**: Information for getting up and running with Tauri, including prerequisites and installation instructions
- **core concepts**: Topics that you should get more intimately familiar with if you want to get the most out of the framework.
- **security**: High-level concepts and security features at the core of Tauri's design and ecosystem that make you, your applications and your users more secure by default
- **develop**: Topics pertaining to the development of Tauri applications, including how to use the Tauri API, communicating between the frontend and backend, configuration, state management, debugging and more.
- **distribute**: Information on the tooling you need to distribute your application either to the platform app stores or as platform-specific installers.
- **learn**: Tutorials intended to provided end-to-end learning experiences to guide you through specific Tauri topics and help you apply knowledge from the guides and reference documentation.
- **plugins**: Information on the extensibility of Tauri from Built-in Tauri features and functionality to provided plugins and recipes built by the Tauri community
- **about**: Various information about Tauri from governance, philosophy, and trademark guidelines.

Each section contains links to detailed markdown files that provide comprehensive information about Tauri's features and how to use them effectively.

**Table of Contents**

## Start
- [Create a Project](https://v2.tauri.app/start/create-project)
- [What is Tauri?](https://v2.tauri.app/start)
- [Project Structure](https://v2.tauri.app/start/project-structure)
- [Prerequisites](https://v2.tauri.app/start/prerequisites)
- [Upgrade from Tauri 1.0](https://v2.tauri.app/start/migrate/from-tauri-1)
- [Upgrade from Tauri 2.0 Beta](https://v2.tauri.app/start/migrate/from-tauri-2-beta)
- [Upgrade & Migrate](https://v2.tauri.app/start/migrate)
- [Frontend Configuration](https://v2.tauri.app/start/frontend)
- [Leptos](https://v2.tauri.app/start/frontend/leptos)
- [Next.js](https://v2.tauri.app/start/frontend/nextjs)
- [Nuxt](https://v2.tauri.app/start/frontend/nuxt)
- [Qwik](https://v2.tauri.app/start/frontend/qwik)
- [SvelteKit](https://v2.tauri.app/start/frontend/sveltekit)
- [Trunk](https://v2.tauri.app/start/frontend/trunk)
- [Vite](https://v2.tauri.app/start/frontend/vite)

## Concept
- [Tauri Architecture](https://v2.tauri.app/concept/architecture)
- [Core Concepts](https://v2.tauri.app/concept)
- [App Size](https://v2.tauri.app/concept/size)
- [Process Model](https://v2.tauri.app/concept/process-model)
- [Brownfield Pattern](https://v2.tauri.app/concept/inter-process-communication/brownfield)
- [Inter-Process Communication](https://v2.tauri.app/concept/inter-process-communication)
- [Isolation Pattern](https://v2.tauri.app/concept/inter-process-communication/isolation)

## Security
- [Capabilities](https://v2.tauri.app/security/capabilities)
- [Content Security Policy (CSP)](https://v2.tauri.app/security/csp)
- [Tauri Ecosystem Security](https://v2.tauri.app/security/ecosystem)
- [Future Work](https://v2.tauri.app/security/future)
- [HTTP Headers](https://v2.tauri.app/security/http-headers)
- [Security](https://v2.tauri.app/security)
- [Application Lifecycle Threats](https://v2.tauri.app/security/lifecycle)
- [Permissions](https://v2.tauri.app/security/permissions)
- [Runtime Authority](https://v2.tauri.app/security/runtime-authority)
- [Command Scopes](https://v2.tauri.app/security/scope)

## Develop
- [Calling Rust from the Frontend](https://v2.tauri.app/develop/calling-rust)
- [Calling the Frontend from Rust](https://v2.tauri.app/develop/calling-frontend)
- [Configuration Files](https://v2.tauri.app/develop/configuration-files)
- [App Icons](https://v2.tauri.app/develop/icons)
- [Develop](https://v2.tauri.app/develop): Core concepts for developing with Tauri.
- [Embedding External Binaries](https://v2.tauri.app/develop/sidecar)
- [Embedding Additional Files](https://v2.tauri.app/develop/resources)
- [State Management](https://v2.tauri.app/develop/state-management)
- [Updating Dependencies](https://v2.tauri.app/develop/updating-dependencies)
- [CrabNebula DevTools](https://v2.tauri.app/develop/debug/crabnebula-devtools)
- [Debug](https://v2.tauri.app/develop/debug)
- [Debug in Neovim](https://v2.tauri.app/develop/debug/neovim)
- [Debug in JetBrains IDEs](https://v2.tauri.app/develop/debug/rustrover)
- [Debug in VS Code](https://v2.tauri.app/develop/debug/vscode)
- [Mobile Plugin Development](https://v2.tauri.app/develop/plugins/develop-mobile)
- [Mock Tauri APIs](https://v2.tauri.app/develop/tests/mocking)
- [Tests](https://v2.tauri.app/develop/tests): Techniques for testing inside and outside the Tauri runtime
- [Plugin Development](https://v2.tauri.app/develop/plugins)
- [Calling the Frontend from Rust](https://v2.tauri.app/develop/_sections/frontend-listen)
- [WebDriver](https://v2.tauri.app/develop/tests/webdriver): WebDriver Testing
- [Continuous Integration](https://v2.tauri.app/develop/tests/webdriver/ci): WebDriver Testing
- [Selenium](https://v2.tauri.app/develop/tests/webdriver/example/selenium)
- [WebdriverIO](https://v2.tauri.app/develop/tests/webdriver/example/webdriverio)

## Distribute
- [App Store](https://v2.tauri.app/distribute/app-store)
- [AppImage](https://v2.tauri.app/distribute/appimage)
- [AUR](https://v2.tauri.app/distribute/aur)
- [Distributing with CrabNebula Cloud](https://v2.tauri.app/distribute/crabnebula-cloud)
- [Debian](https://v2.tauri.app/distribute/debian)
- [DMG](https://v2.tauri.app/distribute/dmg)
- [Flathub](https://v2.tauri.app/distribute/flatpak)
- [Google Play](https://v2.tauri.app/distribute/google-play)
- [Distribute](https://v2.tauri.app/distribute)
- [macOS Application Bundle](https://v2.tauri.app/distribute/macos-application-bundle)
- [Microsoft Store](https://v2.tauri.app/distribute/microsoft-store)
- [RPM](https://v2.tauri.app/distribute/rpm)
- [Snapcraft](https://v2.tauri.app/distribute/snapcraft)
- [Windows Installer](https://v2.tauri.app/distribute/windows-installer)
- [CrabNebula Cloud](https://v2.tauri.app/distribute/pipelines/crabnebula-cloud)
- [GitHub](https://v2.tauri.app/distribute/pipelines/github)
- [Android Code Signing](https://v2.tauri.app/distribute/sign/android)
- [iOS Code Signing](https://v2.tauri.app/distribute/sign/ios)
- [Linux Code Signing](https://v2.tauri.app/distribute/sign/linux)
- [macOS Code Signing](https://v2.tauri.app/distribute/sign/macos)
- [Windows Code Signing](https://v2.tauri.app/distribute/sign/windows)

## Learn
- [Learn](https://v2.tauri.app/learn)
- [Node.js as a sidecar](https://v2.tauri.app/learn/sidecar-nodejs)
- [System Tray](https://v2.tauri.app/learn/system-tray)
- [Window Customization](https://v2.tauri.app/learn/window-customization)
- [Splashscreen](https://v2.tauri.app/learn/splashscreen)
- [Window Menu](https://v2.tauri.app/learn/window-menu)
- [Capabilities for Different Windows and Platforms](https://v2.tauri.app/learn/security/capabilities-for-windows-and-platforms)
- [Using Plugin Permissions](https://v2.tauri.app/learn/security/using-plugin-permissions)
- [Writing Plugin Permissions](https://v2.tauri.app/learn/security/writing-plugin-permissions)