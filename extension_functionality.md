# Person Expression Extension - Functionality Specification

## Overview

This document provides detailed functionality specifications for the Person Expression extension, organized by class and object. This serves as a UML-like specification for implementation.

## Main Extension Class

### `PersonExpressionExtension`

The main extension class that orchestrates all functionality.

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `extensionName` | string | Extension identifier ("PersonExpressionExtension") |
| `extensionSettings` | object | Reference to extension settings in SillyTavern |
| `defaultSettings` | object | Default configuration values |
| `expressionManager` | ExpressionManager | Manages expression images |
| `displayPanel` | DisplayPanel | Manages display panel |
| `settingsManager` | SettingsManager | Manages settings |
| `classificationSource` | ClassificationSource | Handles classification data |

**Methods:**

#### `init()`

Initializes the extension.

**Flow:**
1. Log initialization
2. Load settings
3. Initialize classification source
4. Build display panel
5. Attach event listeners
6. Apply initial settings
7. Log completion

**Pseudocode:**
```javascript
async function init() {
    console.log('[PersonExpressionExtension] Initializing...');
    
    await loadSettings();
    classificationSource = new ClassificationSource();
    await classificationSource.loadClassification();
    
    displayPanel = new DisplayPanel();
    displayPanel.buildPanel();
    
    setupEventListeners();
    applySettings();
    
    console.log('[PersonExpressionExtension] Initialized');
}
```

#### `loadSettings()`

Loads extension settings from SillyTavern storage.

**Flow:**
1. Initialize settings object if not exists
2. Apply defaults for missing keys
3. Log loaded settings

**Pseudocode:**
```javascript
async function loadSettings() {
    extensionSettings[extensionName] = extensionSettings[extensionName] || {};
    
    const defaults = getDefaultSettings();
    for (const key of Object.keys(defaults)) {
        if (!Object.hasOwn(extensionSettings[extensionName], key)) {
            extensionSettings[extensionName][key] = defaults[key];
        }
    }
    
    console.log('[PersonExpressionExtension] Settings loaded');
}
```

#### `applySettings()`

Applies current settings to the UI.

**Flow:**
1. Get current settings
2. Update panel position
3. Update panel size
4. Update auto-hide settings
5. Show/hide panel based on enabled state

**Pseudocode:**
```javascript
function applySettings() {
    const settings = extensionSettings[extensionName];
    
    if (displayPanel) {
        displayPanel.setPosition(settings.position);
        displayPanel.setSize(settings.width, settings.height);
        displayPanel.setAutoHide(settings.autoHide, settings.autoHideDelay);
        
        if (settings.enabled) {
            displayPanel.show();
        } else {
            displayPanel.hide();
        }
    }
    
    console.log('[PersonExpressionExtension] Settings applied');
}
```

#### `getDefaultSettings()`

Returns default settings object.

**Returns:** object - Default settings

**Default Values:**
```javascript
{
    enabled: true,
    position: 'top-right',
    width: 300,
    height: 300,
    autoHide: false,
    autoHideDelay: 30,
    showLabel: true,
    transitionDuration: 300,
    classificationSourcePath: 'data/classifications.json'
}
```

## Expression Manager

### `ExpressionManager`

Manages expression images for personas.

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `expressions` | Map<string, string[]> | Map of persona IDs to expression arrays |
| `currentPersonaId` | string | Currently active persona ID |
| `currentExpressionIndex` | number | Index of current expression |
| `classificationSource` | ClassificationSource | Source for classification data |

**Methods:**

#### `loadExpressions(personaId)`

Loads expressions for a persona from classification source.

**Parameters:**
- `personaId` (string) - Persona identifier

**Returns:** string[] - Array of expression image paths

**Flow:**
1. Check if expressions already loaded
2. If not, load from classification source
3. Return expression array

**Pseudocode:**
```javascript
async function loadExpressions(personaId) {
    if (expressions.has(personaId)) {
        return expressions.get(personaId);
    }
    
    const classification = await classificationSource.getClassification(personaId);
    const expressionList = classification?.expressions || [];
    
    expressions.set(personaId, expressionList);
    return expressionList;
}
```

#### `setExpression(personaId, expressionIndex)`

Sets the current expression for a persona.

**Parameters:**
- `personaId` (string) - Persona identifier
- `expressionIndex` (number) - Index of expression to display

**Flow:**
1. Validate persona exists
2. Validate expression index
3. Update current expression index
4. Return expression path

**Pseudocode:**
```javascript
function setExpression(personaId, expressionIndex) {
    const expressionList = expressions.get(personaId);
    
    if (!expressionList) {
        console.warn('[ExpressionManager] No expressions for persona:', personaId);
        return null;
    }
    
    const index = Math.max(0, Math.min(expressionIndex, expressionList.length - 1));
    currentExpressionIndex = index;
    currentPersonaId = personaId;
    
    return expressionList[index];
}
```

#### `getNextExpression(personaId)`

Gets the next expression for a persona (cycling through).

**Parameters:**
- `personaId` (string) - Persona identifier

**Returns:** string | null - Next expression path or null

**Flow:**
1. Load expressions if not loaded
2. Increment expression index
3. Handle wraparound
4. Return next expression

**Pseudocode:**
```javascript
function getNextExpression(personaId) {
    const expressionList = expressions.get(personaId);
    
    if (!expressionList || expressionList.length === 0) {
        return null;
    }
    
    currentExpressionIndex = (currentExpressionIndex + 1) % expressionList.length;
    return expressionList[currentExpressionIndex];
}
```

#### `handlePersonaChange(personaId)`

Handles persona change event.

**Parameters:**
- `personaId` (string) - New persona identifier

**Flow:**
1. Load expressions for new persona
2. Set first expression as default
3. Return expression path

**Pseudocode:**
```javascript
async function handlePersonaChange(personaId) {
    await loadExpressions(personaId);
    return setExpression(personaId, 0);
}
```

## Classification Source

### `ClassificationSource`

Handles classification data from local source.

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `classificationData` | object | Loaded classification data |
| `sourcePath` | string | Path to classification file |
| `isLoaded` | boolean | Whether data is loaded |

**Methods:**

#### `loadClassification()`

Loads classification data from file.

**Returns:** Promise<object> - Classification data

**Flow:**
1. Check if already loaded
2. Fetch classification file
3. Parse JSON data
4. Store in memory
5. Return data

**Pseudocode:**
```javascript
async function loadClassification() {
    if (isLoaded) {
        return classificationData;
    }
    
    try {
        const response = await fetch(sourcePath);
        classificationData = await response.json();
        isLoaded = true;
        
        console.log('[ClassificationSource] Data loaded:', Object.keys(classificationData).length, 'entries');
        return classificationData;
    } catch (error) {
        console.error('[ClassificationSource] Failed to load:', error);
        classificationData = {};
        return classificationData;
    }
}
```

#### `getClassification(personaId)`

Gets classification data for a persona.

**Parameters:**
- `personaId` (string) - Persona identifier

**Returns:** object | null - Classification data or null

**Pseudocode:**
```javascript
function getClassification(personaId) {
    if (!isLoaded) {
        return null;
    }
    
    return classificationData[personaId] || null;
}
```

#### `updateClassification(personaId, expressions)`

Updates classification data for a persona.

**Parameters:**
- `personaId` (string) - Persona identifier
- `expressions` (string[]) - Array of expression paths

**Flow:**
1. Update in-memory data
2. Save to file
3. Return success status

**Pseudocode:**
```javascript
async function updateClassification(personaId, expressions) {
    classificationData[personaId] = {
        expressions: expressions,
        updatedAt: Date.now()
    };
    
    try {
        await saveClassification();
        return true;
    } catch (error) {
        console.error('[ClassificationSource] Failed to save:', error);
        return false;
    }
}
```

#### `saveClassification()`

Saves classification data to file.

**Flow:**
1. Convert to JSON
2. Save to file
3. Return success status

**Pseudocode:**
```javascript
async function saveClassification() {
    const response = await fetch(sourcePath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classificationData)
    });
    
    return response.ok;
}
```

## Display Panel

### `DisplayPanel`

Manages the expression display panel UI.

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `panelElement` | jQuery | Panel DOM element |
| `imageElement` | jQuery | Image DOM element |
| `labelElement` | jQuery | Label DOM element |
| `position` | string | Current position |
| `width` | number | Panel width |
| `height` | number | Panel height |
| `autoHide` | boolean | Auto-hide enabled |
| `autoHideTimer` | number | Auto-hide timer ID |

**Methods:**

#### `buildPanel()`

Builds and appends panel to DOM.

**Flow:**
1. Create panel HTML
2. Append to root
3. Cache DOM references
4. Return panel element

**Pseudocode:**
```javascript
function buildPanel() {
    const panelHtml = `
        <div id="person_expression_panel" class="person-expression-panel">
            <div class="panel-content">
                <img id="person_expression_image" src="" alt="Expression">
                <div id="person_expression_label" class="expression-label"></div>
            </div>
        </div>
    `;
    
    panelElement = $(panelHtml);
    imageElement = $('#person_expression_image');
    labelElement = $('#person_expression_label');
    
    $('#root').append(panelElement);
    
    return panelElement;
}
```

#### `showExpression(imagePath, label)`

Displays an expression image.

**Parameters:**
- `imagePath` (string) - Path to image file
- `label` (string) - Expression label

**Flow:**
1. Fade out current image
2. Update image source
3. Update label
4. Fade in new image

**Pseudocode:**
```javascript
function showExpression(imagePath, label) {
    imageElement.fadeOut(transitionDuration, () => {
        imageElement.attr('src', imagePath);
        
        if (showLabel && label) {
            labelElement.text(label);
            labelElement.show();
        } else {
            labelElement.hide();
        }
        
        imageElement.fadeIn(transitionDuration);
    });
}
```

#### `setPosition(position)`

Sets panel position.

**Parameters:**
- `position` (string) - Position (top-left, top-right, bottom-left, bottom-right)

**Flow:**
1. Update position property
2. Apply CSS classes
3. Update panel styles

**Pseudocode:**
```javascript
function setPosition(position) {
    this.position = position;
    
    panelElement
        .removeClass('top-left top-right bottom-left bottom-right')
        .addClass(position);
    
    const positions = {
        'top-left': { top: '10px', left: '10px', right: 'auto', bottom: 'auto' },
        'top-right': { top: '10px', left: 'auto', right: '10px', bottom: 'auto' },
        'bottom-left': { top: 'auto', left: '10px', right: 'auto', bottom: '10px' },
        'bottom-right': { top: 'auto', left: 'auto', right: '10px', bottom: '10px' }
    };
    
    panelElement.css(positions[position]);
}
```

#### `setSize(width, height)`

Sets panel size.

**Parameters:**
- `width` (number) - Panel width in pixels
- `height` (number) - Panel height in pixels

**Flow:**
1. Update size properties
2. Apply CSS styles

**Pseudocode:**
```javascript
function setSize(width, height) {
    this.width = width;
    this.height = height;
    
    panelElement.css({
        width: width + 'px',
        height: height + 'px'
    });
    
    imageElement.css({
        maxWidth: width + 'px',
        maxHeight: height + 'px'
    });
}
```

#### `show()`

Shows the panel.

**Flow:**
1. Clear auto-hide timer
2. Fade in panel

**Pseudocode:**
```javascript
function show() {
    clearTimeout(autoHideTimer);
    panelElement.fadeIn(transitionDuration);
}
```

#### `hide()`

Hides the panel.

**Flow:**
1. Fade out panel

**Pseudocode:**
```javascript
function hide() {
    panelElement.fadeOut(transitionDuration);
}
```

#### `setAutoHide(enabled, delay)`

Sets auto-hide behavior.

**Parameters:**
- `enabled` (boolean) - Auto-hide enabled
- `delay` (number) - Delay in seconds

**Flow:**
1. Update properties
2. Attach/detach event listeners

**Pseudocode:**
```javascript
function setAutoHide(enabled, delay) {
    this.autoHide = enabled;
    this.autoHideDelay = delay;
    
    if (enabled) {
        $(document).on('mousemove.person-expression', resetAutoHideTimer);
        $(document).on('keydown.person-expression', resetAutoHideTimer);
    } else {
        $(document).off('.person-expression');
    }
}
```

#### `resetAutoHideTimer()`

Resets auto-hide timer.

**Flow:**
1. Clear existing timer
2. Set new timer

**Pseudocode:**
```javascript
function resetAutoHideTimer() {
    clearTimeout(autoHideTimer);
    
    if (autoHide && panelElement.is(':visible')) {
        autoHideTimer = setTimeout(() => {
            hide();
        }, autoHideDelay * 1000);
    }
}
```

## Settings Manager

### `SettingsManager`

Manages extension settings.

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `settings` | object | Current settings |
| `defaultSettings` | object | Default settings |

**Methods:**

#### `loadSettings()`

Loads settings from SillyTavern storage.

**Flow:**
1. Get extension settings
2. Apply defaults for missing keys
3. Return settings

**Pseudocode:**
```javascript
function loadSettings() {
    const storedSettings = extensionSettings[extensionName] || {};
    const defaults = getDefaultSettings();
    
    settings = { ...defaults };
    
    for (const key of Object.keys(storedSettings)) {
        if (Object.hasOwn(defaults, key)) {
            settings[key] = storedSettings[key];
        }
    }
    
    return settings;
}
```

#### `saveSettings()`

Saves settings to SillyTavern storage.

**Flow:**
1. Update stored settings
2. Save to SillyTavern
3. Log success

**Pseudocode:**
```javascript
function saveSettings() {
    extensionSettings[extensionName] = { ...settings };
    saveSettingsDebounced();
    console.log('[SettingsManager] Settings saved');
}
```

#### `updateSetting(key, value)`

Updates a single setting.

**Parameters:**
- `key` (string) - Setting key
- `value` (*) - Setting value

**Flow:**
1. Update setting value
2. Save settings
3. Return new value

**Pseudocode:**
```javascript
function updateSetting(key, value) {
    settings[key] = value;
    saveSettings();
    return value;
}
```

#### `getSetting(key)`

Gets a setting value.

**Parameters:**
- `key` (string) - Setting key

**Returns:** * - Setting value

**Pseudocode:**
```javascript
function getSetting(key) {
    return settings[key];
}
```

## Event Handlers

### `setupEventListeners()`

Sets up all event listeners.

**Events:**

| Event | Handler | Description |
|-------|---------|-------------|
| `CHAT_CHANGED` | handleChatChanged | Persona switch |
| `MESSAGE_RECEIVED` | handleMessageReceived | Incoming message |
| `MESSAGE_SENT` | handleMessageSent | User message |
| `GENERATION_STARTED` | handleGenerationStarted | AI generation |
| `GENERATION_STOPPED` | handleGenerationStopped | Generation stopped |
| `SETTINGS_UPDATED` | handleSettingsUpdated | Settings change |

**Pseudocode:**
```javascript
function setupEventListeners() {
    const { eventSource, event_types } = getContext();
    
    eventSource.on(event_types.CHAT_CHANGED, handleChatChanged);
    eventSource.on(event_types.MESSAGE_RECEIVED, handleMessageReceived);
    eventSource.on(event_types.MESSAGE_SENT, handleMessageSent);
    eventSource.on(event_types.GENERATION_STARTED, handleGenerationStarted);
    eventSource.on(event_types.GENERATION_STOPPED, handleGenerationStopped);
    eventSource.on(event_types.SETTINGS_UPDATED, handleSettingsUpdated);
}
```

### `handleChatChanged()`

Handles chat context change.

**Flow:**
1. Get current persona ID
2. Load expressions for persona
3. Display first expression

**Pseudocode:**
```javascript
async function handleChatChanged() {
    const { characterId, characters } = getContext();
    
    if (characterId === undefined || characterId === null) {
        displayPanel.hide();
        return;
    }
    
    const personaId = characters[characterId]?.name || 'default';
    const expression = await expressionManager.handlePersonaChange(personaId);
    
    if (expression) {
        displayPanel.showExpression(expression, personaId);
    }
}
```

### `handleMessageReceived()`

Handles incoming message.

**Flow:**
1. Check if auto-hide enabled
2. Show panel if hidden
3. Reset auto-hide timer

**Pseudocode:**
```javascript
function handleMessageReceived() {
    if (displayPanel.autoHide) {
        displayPanel.show();
        displayPanel.resetAutoHideTimer();
    }
}
```

## Utility Functions

### `getContext()`

Gets SillyTavern context.

**Returns:** object - SillyTavern context

### `saveSettingsDebounced()`

Saves settings with debounce.

**Flow:**
1. Debounce save operation
2. Persist to storage

### `toastr.success(message, title)`

Shows success notification.

**Parameters:**
- `message` (string) - Notification message
- `title` (string) - Notification title

### `toastr.error(message, title)`

Shows error notification.

**Parameters:**
- `message` (string) - Notification message
- `title` (string) - Notification title

## POC Functionality

For the initial proof of concept, implement simplified versions:

### Simplified ExpressionManager

```javascript
class ExpressionManager {
    constructor() {
        this.expressions = new Map();
        this.currentPersonaId = null;
    }
    
    async loadExpressions(personaId) {
        // Load from simple JSON file
        const response = await fetch('data/expressions.json');
        const data = await response.json();
        this.expressions.set(personaId, data[personaId] || []);
    }
    
    setExpression(personaId, expressionIndex = 0) {
        const expressions = this.expressions.get(personaId) || [];
        this.currentPersonaId = personaId;
        return expressions[expressionIndex] || null;
    }
}
```

### Simplified DisplayPanel

```javascript
class DisplayPanel {
    constructor() {
        this.panelElement = null;
        this.imageElement = null;
    }
    
    buildPanel() {
        const html = `
            <div id="person_expression_panel">
                <img id="person_expression_image" src="">
            </div>
        `;
        this.panelElement = $(html);
        this.imageElement = $('#person_expression_image');
        $('#root').append(this.panelElement);
    }
    
    showExpression(imagePath) {
        this.imageElement.attr('src', imagePath);
        this.panelElement.show();
    }
    
    hide() {
        this.panelElement.hide();
    }
}
```

## Implementation Notes

1. **Error Handling**: Always handle missing expressions gracefully
2. **Performance**: Use debounced settings save
3. **Memory**: Clean up event listeners on unload
4. **Compatibility**: Support both character and persona workflows
5. **Extensibility**: Design for future enhancements

## Dependencies

- SillyTavern extension API
- jQuery
- SillyTavern context system
- SillyTavern event system
- SillyTavern settings system

## Testing Checklist

- [ ] Extension loads without errors
- [ ] Settings persist across sessions
- [ ] Expressions display correctly
- [ ] Panel position and size settings work
- [ ] Auto-hide functionality works
- [ ] Persona changes trigger expression updates
- [ ] Missing expressions handled gracefully
- [ ] No performance degradation
- [ ] Event listeners cleaned up on unload

## Future Enhancements

1. **Expression Triggers**: Add sentiment-based triggers
2. **Multi-Persona**: Support group chat expressions
3. **Custom Sources**: Support URL and file browser
4. **Animation**: Add expression transition animations
5. **Library**: Add expression library management
6. **Export/Import**: Add settings export/import
7. **Preset Support**: Add preset-based configuration
8. **Advanced Classification**: Support multiple classification sources

## Conclusion

This functionality specification provides a complete UML-like design for the Person Expression extension. Each class and method is documented with parameters, return values, and implementation notes to guide development.

The POC implementation should focus on the core functionality:
1. Expression display for personas
2. Local classification integration
3. Basic settings management
4. Event handling for persona changes

Once the POC is working, additional features can be added incrementally.
