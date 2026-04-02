# Person Expression Extension - SillyTavern Integration Guide

## Overview

This document provides detailed guidance on implementing the Person Expression extension using SillyTavern's APIs. It covers all integration points, event handling, and best practices.

## SillyTavern Extension API

### Extension Registration

Extensions are automatically loaded from `scripts/extensions/third-party/` directory.

**Directory Structure:**
```
scripts/extensions/third-party/PersonExpressionExtension/
├── manifest.json
├── index.js
├── settings.html
├── style.css
└── assets/
```

### Manifest Configuration

The [`manifest.json`](manifest.json) file defines extension metadata:

```json
{
    "display_name": "Person Expression",
    "loading_order": 10,
    "requires": [],
    "optional": [],
    "js": "index.js",
    "css": "style.css",
    "author": "YourName",
    "version": "1.0.0",
    "homePage": "https://github.com/yourusername/person-expression"
}
```

**Key Fields:**
- `display_name`: How the extension appears in the UI
- `loading_order`: Priority (lower numbers load first)
- `requires`: Required extensions (empty array if none)
- `optional`: Optional dependencies (empty array if none)
- `js`: Main JavaScript file
- `css`: Stylesheet file

## Core API Integration

### Getting Context

```javascript
import { getContext } from "../../../extensions.js";

const { 
    eventSource, 
    event_types, 
    extensionSettings,
    characters,
    characterId,
    chat,
    groups,
    groupId 
} = getContext();
```

**Context Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `eventSource` | EventEmitter | Event emitter for listening to events |
| `event_types` | Object | Object containing all event type constants |
| `extensionSettings` | Object | Extension settings storage |
| `characters` | Array | Array of character objects |
| `characterId` | number | Index of current character |
| `chat` | Array | Chat message history |
| `groups` | Array | Array of group objects |
| `groupId` | string | ID of current group |

### Settings Management

#### Loading Settings

```javascript
import { extensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

const extensionName = "PersonExpressionExtension";

async function loadSettings() {
    // Initialize settings if they don't exist
    extensionSettings[extensionName] = extensionSettings[extensionName] || {};
    
    // Default settings
    const defaultSettings = {
        enabled: true,
        position: 'top-right',
        width: 300,
        height: 300,
        autoHide: false,
        autoHideDelay: 30,
        showLabel: true,
        transitionDuration: 300,
        classificationSourcePath: 'data/classifications.json'
    };
    
    // Apply defaults for missing keys
    for (const key of Object.keys(defaultSettings)) {
        if (!Object.hasOwn(extensionSettings[extensionName], key)) {
            extensionSettings[extensionName][key] = defaultSettings[key];
        }
    }
    
    return extensionSettings[extensionName];
}
```

#### Saving Settings

```javascript
function saveSettings() {
    // Save to SillyTavern's storage
    saveSettingsDebounced();
    
    // Show success message
    toastr.success('Settings saved successfully!', 'Person Expression');
}
```

### Event Handling

#### Listening to Events

```javascript
import { getContext } from "../../../extensions.js";

const { eventSource, event_types } = getContext();

// Listen to chat changed event
eventSource.on(event_types.CHAT_CHANGED, handleChatChanged);

// Listen to message received event
eventSource.on(event_types.MESSAGE_RECEIVED, handleMessageReceived);

// Listen to generation started event
eventSource.on(event_types.GENERATION_STARTED, handleGenerationStarted);

// Listen to generation stopped event
eventSource.on(event_types.GENERATION_STOPPED, handleGenerationStopped);

// Listen to settings updated event
eventSource.on(event_types.SETTINGS_UPDATED, handleSettingsUpdated);
```

#### Event Handler Functions

```javascript
async function handleChatChanged() {
    const { characterId, characters } = getContext();
    
    // Check if character exists
    if (characterId === undefined || characterId === null) {
        console.log('[PersonExpression] No character selected');
        return;
    }
    
    // Get current character
    const character = characters[characterId];
    const personaId = character?.name || 'default';
    
    // Load and display expression
    await loadExpressionForPersona(personaId);
}

function handleMessageReceived() {
    // Reset auto-hide timer if enabled
    if (autoHideEnabled) {
        resetAutoHideTimer();
    }
}

function handleGenerationStarted() {
    // Show panel during generation
    showPanel();
}

function handleGenerationStopped() {
    // Optional: Hide panel after generation
    if (autoHideEnabled) {
        startAutoHideTimer();
    }
}

function handleSettingsUpdated() {
    // Reload settings and apply
    loadSettings();
    applySettings();
}
```

#### Emitting Custom Events

```javascript
import { eventSource } from "../../../extensions.js";

// Emit custom event
const eventType = 'person_expression_changed';
const eventData = {
    personaId: 'character_name',
    expression: 'expression_path'
};

await eventSource.emit(eventType, eventData);
```

## UI Integration

### Settings Panel

#### Loading Settings HTML

```javascript
import { extensionSettings } from "../../../extensions.js";

const extensionName = "PersonExpressionExtension";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

async function loadSettingsUI() {
    // Load settings HTML from file
    const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);
    
    // Append to extensions settings panel
    $('#extensions_settings').append(settingsHtml);
    
    console.log('[PersonExpression] Settings UI loaded');
}
```

#### Settings HTML Structure

```html
<div class="setting-group">
    <label class="setting-label">
        <input type="checkbox" id="person_expression_enabled">
        Enable Person Expression Panel
    </label>
</div>

<div class="setting-group">
    <label for="person_expression_position">Display Position:</label>
    <select id="person_expression_position" class="setting-control">
        <option value="top-right">Top Right</option>
        <option value="top-left">Top Left</option>
        <option value="bottom-right">Bottom Right</option>
        <option value="bottom-left">Bottom Left</option>
    </select>
</div>

<div class="setting-group">
    <label for="person_expression_width">Panel Width: <span id="person_expression_width_value">300px</span></label>
    <input type="range" id="person_expression_width" 
           class="setting-control" min="150" max="500" value="300">
</div>

<div class="setting-group">
    <label class="setting-label">
        <input type="checkbox" id="person_expression_autohide">
        Auto-hide when idle
    </label>
</div>

<div class="setting-group" id="person_expression_delay_group" style="display:none">
    <label for="person_expression_delay">Hide After (seconds):</label>
    <input type="number" id="person_expression_delay" 
           class="setting-control" min="5" max="300" value="30">
</div>

<div class="setting-group">
    <button id="person_expression_save_settings" 
            class="setting-btn" style="background-color: #4CAF50;">Save Settings</button>
    <small class="setting-hint">Click to save all settings to storage</small>
</div>
```

#### Event Listeners for Settings

```javascript
function setupSettingsListeners() {
    // Enable/disable checkbox
    $('#person_expression_enabled').on('change', function() {
        const enabled = $(this).prop('checked');
        extensionSettings[extensionName].enabled = enabled;
        
        if (enabled) {
            $('#person_expression_panel').fadeIn(200);
        } else {
            $('#person_expression_panel').fadeOut(200);
        }
    });
    
    // Position dropdown
    $('#person_expression_position').on('change', function() {
        const position = $(this).val();
        extensionSettings[extensionName].position = position;
        applyPanelPosition(position);
    });
    
    // Width slider
    $('#person_expression_width').on('input', function() {
        const width = parseInt($(this).val(), 10);
        $('#person_expression_width_value').text(width + 'px');
        extensionSettings[extensionName].width = width;
        $('#person_expression_panel').css('width', width + 'px');
    });
    
    // Auto-hide checkbox
    $('#person_expression_autohide').on('change', function() {
        const autoHide = $(this).prop('checked');
        extensionSettings[extensionName].autoHide = autoHide;
        $('#person_expression_delay_group').toggle(autoHide);
    });
    
    // Delay input
    $('#person_expression_delay').on('input', function() {
        const delay = parseInt($(this).val(), 10);
        extensionSettings[extensionName].autoHideDelay = delay;
    });
    
    // Save settings button
    $('#person_expression_save_settings').on('click', function() {
        saveSettings();
        applySettings();
    });
}
```

### Display Panel

#### Building the Panel

```javascript
function buildDisplayPanel() {
    const settings = extensionSettings[extensionName];
    
    const panelHtml = `
        <div id="person_expression_panel" class="person-expression-panel" 
             style="width: ${settings.width}px;">
            <div class="panel-content">
                <img id="person_expression_image" 
                     src="scripts/extensions/third-party/PersonExpressionExtension/assets/placeholder.png" 
                     alt="Expression">
                <div id="person_expression_label" class="expression-label"></div>
            </div>
        </div>
    `;
    
    $('#root').append(panelHtml);
    
    console.log('[PersonExpression] Display panel created');
}
```

#### Panel CSS Classes

```css
.person-expression-panel {
    position: fixed;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.8);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transition: opacity 0.3s ease;
}

.person-expression-panel.top-right {
    top: 10px;
    right: 10px;
    left: auto;
    bottom: auto;
}

.person-expression-panel.top-left {
    top: 10px;
    left: 10px;
    right: auto;
    bottom: auto;
}

.person-expression-panel.bottom-right {
    bottom: 10px;
    right: 10px;
    top: auto;
    left: auto;
}

.person-expression-panel.bottom-left {
    bottom: 10px;
    left: 10px;
    top: auto;
    right: auto;
}

.person-expression-panel .panel-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px;
}

.person-expression-panel #person_expression_image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
}

.expression-label {
    margin-top: 5px;
    color: white;
    font-size: 12px;
    text-align: center;
    text-shadow: 1px 1px 2px black;
}
```

#### Updating Panel Display

```javascript
function updatePanelDisplay(imagePath, label) {
    const imageElement = $('#person_expression_image');
    const labelElement = $('#person_expression_label');
    
    if (imageElement.length) {
        // Fade out
        imageElement.fadeOut(100, () => {
            // Update image
            imageElement.attr('src', imagePath);
            
            // Update label
            if (label && extensionSettings[extensionName].showLabel) {
                labelElement.text(label);
                labelElement.show();
            } else {
                labelElement.hide();
            }
            
            // Fade in
            imageElement.fadeIn(200);
        });
    }
}
```

## Classification Source Integration

### Loading Classification Data

```javascript
async function loadClassificationData() {
    const settings = extensionSettings[extensionName];
    const sourcePath = settings.classificationSourcePath;
    
    try {
        const response = await fetch(sourcePath);
        
        if (!response.ok) {
            throw new Error(`Failed to load classification: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('[PersonExpression] Classification data loaded:', Object.keys(data).length, 'entries');
        
        return data;
    } catch (error) {
        console.error('[PersonExpression] Failed to load classification:', error);
        return {};
    }
}
```

### Getting Expression for Persona

```javascript
function getExpressionForPersona(personaId, classificationData) {
    const personaData = classificationData[personaId];
    
    if (!personaData || !personaData.expressions || personaData.expressions.length === 0) {
        console.warn('[PersonExpression] No expressions found for persona:', personaId);
        return null;
    }
    
    // Return first expression as default
    return personaData.expressions[0];
}
```

### Handling Persona Changes

```javascript
async function handlePersonaChange() {
    const { characterId, characters } = getContext();
    
    // Check if character exists
    if (characterId === undefined || characterId === null) {
        console.log('[PersonExpression] No character selected');
        return;
    }
    
    // Get current character
    const character = characters[characterId];
    const personaId = character?.name || 'default';
    
    // Load classification data
    const classificationData = await loadClassificationData();
    
    // Get expression for persona
    const expressionPath = getExpressionForPersona(personaId, classificationData);
    
    if (expressionPath) {
        updatePanelDisplay(expressionPath, personaId);
    } else {
        console.log('[PersonExpression] No expression found for persona:', personaId);
    }
}
```

## Event Types Reference

### Built-in Event Types

```javascript
const event_types = {
    // Application lifecycle
    APP_INITIALIZED: 'app_initialized',
    APP_READY: 'app_ready',
    
    // Chat events
    CHAT_CHANGED: 'chat_changed',
    MESSAGE_SENT: 'message_sent',
    MESSAGE_RECEIVED: 'message_received',
    
    // Generation events
    GENERATION_STARTED: 'generation_started',
    GENERATION_STOPPED: 'generation_stopped',
    GENERATION_ENDED: 'generation_ended',
    
    // Settings events
    SETTINGS_UPDATED: 'settings_updated',
    
    // Character events
    CHARACTER_CHANGED: 'character_changed',
    CHARACTER_LIST_CHANGED: 'character_list_changed',
    
    // Group events
    GROUP_CHANGED: 'group_changed',
    GROUP_LIST_CHANGED: 'group_list_changed',
    
    // File events
    FILE_CHANGED: 'file_changed',
    
    // UI events
    UI_RESIZED: 'ui_resized',
    
    // Custom events
    CUSTOM_EVENT: 'custom_event'
};
```

## Best Practices

### 1. Error Handling

```javascript
try {
    // Extension code
} catch (error) {
    console.error('[PersonExpression] Error:', error);
    toastr.error('An error occurred: ' + error.message, 'Person Expression');
}
```

### 2. Memory Management

```javascript
// Cleanup on unload
$(window).on('beforeunload', () => {
    // Remove event listeners
    $(document).off('.person-expression-extension');
    
    // Clear timers
    if (autoHideTimer) {
        clearTimeout(autoHideTimer);
        autoHideTimer = null;
    }
    
    console.log('[PersonExpression] Cleanup complete');
});
```

### 3. Performance Optimization

```javascript
// Debounced settings save
let saveTimer = null;

function saveSettingsDebounced() {
    if (saveTimer) {
        clearTimeout(saveTimer);
    }
    
    saveTimer = setTimeout(() => {
        saveSettings();
        saveTimer = null;
    }, 500); // 500ms debounce
}
```

### 4. State Management

```javascript
let extensionState = {
    initialized: false,
    settingsLoaded: false,
    panelVisible: true,
    autoHideActive: false
};

function setState(key, value) {
    extensionState[key] = value;
    console.log('[PersonExpression] State updated:', key, value);
}
```

## Complete Initialization Flow

```javascript
async function init() {
    console.log('[PersonExpression] Initializing...');
    
    try {
        // 1. Load settings
        await loadSettings();
        setState('settingsLoaded', true);
        
        // 2. Load classification data
        const classificationData = await loadClassificationData();
        setState('classificationLoaded', true);
        
        // 3. Build display panel
        buildDisplayPanel();
        setState('panelBuilt', true);
        
        // 4. Load settings UI
        await loadSettingsUI();
        
        // 5. Setup event listeners
        setupEventListeners();
        setupSettingsListeners();
        
        // 6. Apply initial settings
        applySettings();
        
        // 7. Load initial expression
        await handlePersonaChange();
        
        setState('initialized', true);
        console.log('[PersonExpression] Initialized successfully');
        
    } catch (error) {
        console.error('[PersonExpression] Initialization failed:', error);
        toastr.error('Failed to initialize Person Expression extension', 'Error');
    }
}

// Initialize when DOM is ready
$(document).ready(init);
```

## Testing Checklist

- [ ] Extension loads without errors
- [ ] Settings persist across sessions
- [ ] Panel displays in correct position
- [ ] Panel size settings work
- [ ] Auto-hide functionality works
- [ ] Persona changes trigger expression updates
- [ ] Missing expressions handled gracefully
- [ ] No performance degradation
- [ ] Event listeners cleaned up on unload
- [ ] Settings UI updates correctly

## Troubleshooting

### Extension Not Loading

1. Check manifest.json is valid JSON
2. Verify file names match manifest
3. Check browser console for errors
4. Ensure directory name matches manifest

### Settings Not Persisting

1. Check saveSettingsDebounced() is called
2. Verify extensionSettings is being updated
3. Check browser console for errors

### Panel Not Displaying

1. Verify panel HTML is appended to #root
2. Check CSS classes are applied correctly
3. Verify panel visibility settings
4. Check browser console for errors

### Expressions Not Loading

1. Verify classification file path
2. Check file is accessible
3. Verify JSON structure matches expected format
4. Check browser console for errors

## Conclusion

This guide provides comprehensive coverage of SillyTavern extension API integration for the Person Expression extension. Follow these patterns and best practices to ensure a robust, maintainable extension.

For additional information, refer to:
- SillyTavern Extension Documentation
- Extension API Source Code
- Example Extensions
- Community Forums

Happy coding!
