# Persona Expressions Extension

A SillyTavern extension that automatically displays persona expressions based on emotion classification of user messages. Similar to the Character Expressions extension but for user personas.

## Overview

This extension analyzes the user's last N messages (configurable, default 3) using a BERT classification model and automatically displays the corresponding expression sprite for the current persona.

## Features

- **Automatic Emotion Classification**: Analyzes user messages using local BERT model
- **Per-Persona Sprites**: Each persona has its own set of expression sprites
- **Multiple Sprites per Expression**: Support for multiple sprites per emotion with random selection
- **Re-roll Option**: Automatically pick a different sprite if the same expression repeats
- **Fallback Expressions**: Set default/fallback expressions when no sprite is found
- **Custom Expressions**: Add custom emotion labels beyond the default 28
- **Slash Commands**: `/pe`, `/persona-expression`, `/persona-classify`, `/persona-list`
- **Drag & Drop**: Repositionable expression panel

## Installation

1. Copy the `persona-expressions` folder to your SillyTavern `public/scripts/extensions/third-party/` directory
2. Restart SillyTavern or reload the page
3. Go to Settings > Extensions to enable and configure the extension

## Usage

### Creating Persona Sprites

1. Create a folder in your sprites directory named after your persona with `persona_` prefix
   - Example: `persona_YourPersonaName`
2. Add expression images with the naming convention:
   - `[expression].[ext]` - e.g., `joy.png`, `anger.png`
   - `[expression]-[index].[ext]` - e.g., `joy-1.png`, `joy-2.png`
   - `[expression].[suffix].[ext]` - e.g., `joy.happy.png`

### Supported Expressions

The extension supports 28 default emotions:
admiration, amusement, anger, annoyance, approval, caring, confusion, curiosity, desire, disappointment, disapproval, disgust, embarrassment, excitement, fear, gratitude, grief, joy, love, nervousness, optimism, pride, realization, relief, remorse, sadness, surprise, neutral

### Slash Commands

| Command | Aliases | Description |
|---------|---------|-------------|
| `/persona-expression` | `/pe`, `/persona-emote` | Set expression for current persona |
| `/persona-list` | `/persona-expressions` | List available expressions |
| `/persona-classify` | | Classify text and return emotion |

### Settings

- **Enable Persona Expressions**: Toggle the extension on/off
- **Messages to Analyze**: Number of recent user messages to classify (1-10)
- **Classifier API**: Local BERT, Extras (deprecated), or None
- **Allow Multiple Sprites**: Allow multiple sprites per expression
- **Re-roll if Same**: Pick different sprite if same expression repeats
- **Default/Fallback Expression**: Expression to show when no sprite found

## File Structure

```
persona-expressions/
├── manifest.json           # Extension metadata
├── index.js               # Main extension code
├── style.css              # Extension styles
├── settings.html          # Settings UI
├── templates/
│   └── list-item.html     # Sprite list item template
└── README.md              # This file
```

## Sprite Storage

Sprites are stored using the existing SillyTavern sprite API with persona prefix:
- Folder naming: `persona_{PersonaName}`
- Example: `persona_Blaze/joy.png`

## Requirements

- SillyTavern version: 1.0.0 or higher
- Browser: Modern browser with ES6+ support
- Optional: Local BERT classification module for auto-classification

## License

MIT License

## Author

SillyTavern User

## Acknowledgments

- Based on the Character Expressions extension by Cohee#1207
- Built for the SillyTavern community
