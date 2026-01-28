# Murmure

An open-source speech-to-text application powered by Google's [Gemini 2.5 Flash](https://ai.google.dev/gemini-api) for fast, accurate transcription. Murmure turns your voice into text with support for 25 European languages. Requires an internet connection and a Google API key.

Learn more on the [official website](https://murmure.al1x-ai.com/).

![demo](public/murmure-screenshot-beautiful.png)

## Features

- **Fast Transcription**: Powered by Gemini 2.5 Flash for quick, accurate speech-to-text conversion.
- **App Detection**: Automatically formats transcriptions based on the active application context.
- **Open Source**: Free and open source software. Inspect, modify, and contribute.
- **Multi-language Support**: Supports 25 European languages for transcription.

## Requirements

- **Google API Key**: You need a Google Gemini API key to use Murmure. Configure it in Settings > LLM Connect.
- **Internet Connection**: Required for transcription as audio is processed through Google's API.

## Supported Languages:

Bulgarian (bg), Croatian (hr), Czech (cs), Danish (da), Dutch (nl), English (en), Estonian (et), Finnish (fi), French (fr), German (de), Greek (el), Hungarian (hu), Italian (it), Latvian (lv), Lithuanian (lt), Maltese (mt), Polish (pl), Portuguese (pt), Romanian (ro), Slovak (sk), Slovenian (sl), Spanish (es), Swedish (sv), Russian (ru), Ukrainian (uk)

## Installation

### Windows (Official)

⚠️ Windows SmartScreen : This installer is **not signed with a commercial certificate** (which costs ~€200–€500/year).  
If you downloaded it from our **official GitHub releases**, you can safely continue.

🛡️ We guarantee the installer is safe, contains **no malware**, and you can verify the source code or even compile it yourself if you prefer.

1. Download Murmure_x64.msi from the [release](https://github.com/Kieirra/murmure/releases) page
2. Run the installer and follow the setup wizard.

> [!WARNING]
> Murmure requires the [Microsoft Visual C++ Redistributable](https://learn.microsoft.com/cpp/windows/latest-supported-vc-redist) to work on Windows. This package is present on most computers, but if you encounter the error message `The code execution cannot proceed because MSVCP140.dll was not found. Reinstalling the program may fix this problem.`, download and install the package from the official page or use this direct download link: [https://aka.ms/vc14/vc_redist.x64.exe](https://aka.ms/vc14/vc_redist.x64.exe)

### Linux (Official)

⚠️ Murmure currently has limited support on Wayland-based distributions (except Fedora, which can fall back to X11 for some apps).  
This appears to be related to Wayland's sandbox restrictions for AppImages, the global shortcut to start recording will not work in this environment.  
No workaround is available yet. See #28

1. Download Murmure_amd64.AppImage from [release](https://github.com/Kieirra/murmure/releases) page
2. Make it executable: `chmod +x Murmure_amd64.AppImage`
3. Run the AppImage.

Murmure uses the [ALSA](https://www.alsa-project.org/wiki/Main_Page) API to
access your microphone, so if you're running Pipewire for your audio stack,
make sure that the ALSA API calls are routed through it (e.g. by installing
[the `pipewire-alsa`
package](https://archlinux.org/packages/extra/x86_64/pipewire-alsa/) on Arch
Linux), otherwise you'll have errors such as `ALSA lib
pcm_dsnoop.c:567:(snd_pcm_dsnoop_open) unable to open slave`.

### MacOS (Official)

⚠️ MacOS may show security warnings because Murmure **isn't signed with a paid Apple certificate**. These warnings are expected for independent apps, and Murmure is safe to install.

🛡️ We guarantee the installer is safe, contains **no malware**, and you can verify the source code or even compile it yourself if you prefer.

1. Download Murmure_aarch64_darwin.dmg from the [release](https://github.com/Kieirra/murmure/releases) page
2. Open the DMG. If macOS blocks it, go to System Settings → Privacy & Security and click "Open Anyway".
3. Drag Murmure to the Applications folder, then open it from there.
4. If you see an "app is damaged" message, click Cancel, run `xattr -cr /Applications/Murmure.app` in Terminal, then reopen Murmure.

### MacOS - Intel (Official) - Experimental

⚠️ MacOS may show security warnings because Murmure **isn't signed with a paid Apple certificate**. These warnings are expected for independent apps, and Murmure is safe to install.

🛡️ We guarantee the installer is safe, contains **no malware**, and you can verify the source code or even compile it yourself if you prefer.

1. Download Murmure_aarch64_darwin.dmg from the [release](https://github.com/Kieirra/murmure/releases) page
2. Open the DMG. If macOS blocks it, go to System Settings → Privacy & Security and click "Open Anyway".
3. Drag Murmure to the Applications folder, then open it from there.
4. If you see an "app is damaged" message, click Cancel, run `xattr -cr /Applications/Murmure.app` in Terminal, then reopen Murmure.

P.S. : This version is experimental

## Setup

1. **Get a Google API Key**: Visit [Google AI Studio](https://aistudio.google.com/app/apikey) to create a free API key.
2. **Configure Murmure**: Go to Settings > LLM Connect and enter your Google API key.
3. **Start transcribing**: Use the global shortcut to record your voice and transcribe.

## Usage

Murmure provides a clean and focused speech-to-text experience.
Once launched, simply start recording your voice. The text appears instantly after processing.

Typical use cases include:

- Dictating to any AI prompt (Cursor, ChatGPT, Mistral, etc.)
- Writing notes hands-free
- Capturing creative ideas or dictation

## Technology

Murmure uses [Gemini 2.5 Flash](https://ai.google.dev/gemini-api), Google's multimodal AI model for fast, accurate speech-to-text transcription. The audio is sent to Google's API for processing, and only the transcribed text is returned and optionally stored locally (last 5 transcriptions).

## Data Privacy

- **Audio Processing**: Your audio is sent to Google's Gemini API for transcription.
- **Local Storage**: Only transcribed text is stored locally (last 5 transcriptions by default).
- **No Telemetry**: Murmure itself does not collect any analytics or telemetry data.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## 🗺️ Roadmap

- [x] (1.7.0) feat(settings): Allow selecting the input microphone, thanks to @litel-fr
- [x] (1.7.0) feat(settings): Add configurable log verbosity levels (trace, debug, info, warn, error)
- [x] (1.7.0) feat(dictionary): import/export words from dictionary (medical preset and other) thanks to @icristescu [#72](https://github.com/Kieirra/murmure/pull/72)
- [x] (1.7.0) feat(command): allow to select text and modify it with a custom command (eg. fix grammar, translate to English, etc.)
- [x] (1.7.0) feat(llm): Add support for multiple saved prompts, instead of a single customizable prompt.
- [x] (1.7.0) feat(llm): enforce prompt instructions with anchor tags and add "Cursor Developer" preset
- [x] (1.7.0) feat(llm): syntax highlighting for prompt editor
- [x] (1.7.0) fix(llm): fix full screen issue on Select Model page on macOS - https://github.com/Kieirra/murmure/issues/82
- [x] (1.7.0) fix(privacy): transcription should not be part of the logs by default [#88](https://github.com/Kieirra/murmure/issues/88)
- [x] (1.7.0) fix(privacy): temporary audio save in tmp folder and not app_dir in case of crash [#88](https://github.com/Kieirra/murmure/issues/88)
- [x] (1.7.0) fix(dictionary): Invalid word format error message
- [x] (1.7.0) fix(format): allow digit conversion threshold to be 0
- [x] (1.7.0) fix(security): update dependencies to fix security vulnerabilities
- [x] (1.7.0) refactor(sonar): fix main sonar issues
- [x] (1.7.0) ci(security): add Security Scanning with SonarQube
- [x] (1.7.0) ci(security): improve static analysis for contributions (test, compilation, linting, etc.)
- [x] (1.7.0) ci(build): nsis exe installer without administration privilege
- [ ] feat(rules): Add regex support for custom rules
- [ ] feat(ui): Add a "?" helper in the "Replacement text" field (explain natural language input and real line breaks instead of `\n`)
- [ ] feat(formatting): Allow rule reordering https://github.com/Kieirra/murmure/issues/104
- [ ] feat(formatting): Improve rules label to make sentences https://github.com/Kieirra/murmure/issues/101#issuecomment-3751551213
- [ ] feat(llm): Allow llm mode reordering https://github.com/Kieirra/murmure/issues/104
- [ ] feat(llm): Automatically detect Ollama at first LLM Connect tutorial.
- [ ] feat(overlay): Allow dragging the overlay to change its position https://github.com/Kieirra/murmure/issues/64
- [ ] feat(dictionary): Virtualize dictionary to handle large dictionaries
- [ ] feat(dictionary): Add an option to clear all dictionary entries
- [ ] feat: Allow pinning Murmure to the dock on linux https://github.com/Kieirra/murmure/issues/64
- [ ] fix(visualizer): Adjust sensitivity (dynamic or lower)
- [ ] fix(visualizer): Visualizer does not always reset at the end of a transcription
- [ ] refactor(settings): Secure settings persistence (migrate to tauri-plugin-store for atomic writes)
- [ ] feat(shortcuts): Add a shortcut to automatically add a selected word to the dictionary (copy selection → read word → add to dictionary)
- [ ] feat(packaging): Add a `.deb` package and register it for Debian / Ubuntu / Linux Mint
- [ ] fix(shortcuts): Improve shortcut support on Linux and Windows
- [ ] fix(overlay): Overlay may freeze under certain conditions (not reproducible yet)
- [ ] fix(overlay): Prevent launching multiple Murmure instances when clicking rapidly (not reproducible yet)
- [ ] (under consideration) feat(advanced): Audio pre-prompt https://github.com/Kieirra/murmure/issues/75
- [ ] (under consideration) feat(webhook): Send an HTTP request after `CTRL + SPACE` (opens up many interesting possibilities)

## Acknowledgments

- Thanks to Google for providing the [Gemini API](https://ai.google.dev/gemini-api), [Tauri](https://github.com/tauri-apps/tauri) for being an amazing tool, and to the open‑source community for their tools and libraries.

## License

Murmure is free and open source, released under the GNU GPL v3 License.
You can inspect, modify, and redistribute it freely as long as derivative works remain open source.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

Reporting issues is done [on GitHub](https://github.com/Kieirra/murmure/issues/new).

## Support Development

If you like Murmure and want to support its development: [Support on Tipeee](https://fr.tipeee.com/murmure-al1x-ai/)

## Code Signing Policy

Free code signing provided by [SignPath.io](https://about.signpath.io/), certificate by [SignPath Foundation](https://signpath.org/).

| Role                   | Team Members                          |
| ---------------------- | ------------------------------------- |
| Committers & reviewers | [Kieirra](https://github.com/Kieirra) |
| Approvers              | [Kieirra](https://github.com/Kieirra) |

### Privacy Policy

See [PRIVACY_POLICY.md](./PRIVACY_POLICY.md).
