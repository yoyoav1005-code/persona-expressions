# Person Expression Extension

A SillyTavern extension that displays persona expressions based on classification data.

## Overview

This extension is similar to the Character Expression extension but works with personas instead of characters. It displays expression images for the currently selected persona based on a local classification source.

## Features

- Display persona expressions based on classification data
- Local classification source (JSON file)
- Configurable panel position (top-left, top-right, bottom-left, bottom-right)
- Auto-hide with configurable delay
- Configurable panel size
- Show/hide expression label
- Smooth fade transitions

## Installation

1. Copy the `PersonExpressionExtension` folder to your SillyTavern `public/scripts/extensions/` directory
2. Restart SillyTavern or reload the page
3. Go to Settings > Extensions to configure the extension

## Usage

1. Place expression images in the `assets/` folder
2. Edit `person-expressions.json` to map persona IDs to expression images
3. Enable the extension in Settings > Extensions
4. Configure the extension settings as desired

## Configuration

The extension can be configured through the Settings menu:

- **Enable Person Expression**: Toggle the extension on/off
- **Position**: Set the panel position (top-left, top-right, bottom-left, bottom-right)
- **Auto Hide**: Enable/disable auto-hide
- **Auto Hide Delay**: Time in milliseconds before auto-hiding
- **Width**: Panel width in pixels
- **Height**: Panel height in pixels
- **Classification File**: Path to the JSON classification file
- **Show Label**: Toggle expression label visibility

## Classification File Format

The classification file (`person-expressions.json` by default) should be a JSON object where keys are persona IDs and values are arrays of expression image paths:

```json
{
    "persona_id_1": [
        "assets/expression1.png",
        "assets/expression2.png"
    ],
    "persona_id_2": [
        "assets/expression3.png"
    ]
}
```

## File Structure

```
PersonExpressionExtension/
├── manifest.json          # Extension metadata
├── index.js              # Main extension code
├── style.css             # Extension styles
├── settings.html         # Settings UI
├── person-expressions.json # Classification data
└── assets/               # Expression images
    └── placeholder.png   # Default placeholder image
```

## Development

### Building

No build process required - the extension uses vanilla JavaScript and CSS.

### Testing

1. Load the extension in SillyTavern
2. Check the browser console for any errors
3. Test with different persona selections
4. Verify settings persistence

## Requirements

- SillyTavern version: 0.1.70 or higher
- Browser: Modern browser with ES6+ support

## License

MIT License

## Author

PersonExpressionTeam

## Acknowledgments

- Inspired by the Character Expression extension
- Built for the SillyTavern community
