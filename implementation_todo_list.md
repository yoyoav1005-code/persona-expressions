# Person Expression Extension - Implementation Todo List

## Overview

This todo list provides a step-by-step implementation guide for the Person Expression extension. Follow these steps in order to build a working POC first, then expand with more features.

---

## Phase 1: Project Setup (POC Foundation)

### Step 1.1: Create Extension Directory Structure
- [ ] Create `PersonExpressionExtension/` directory
- [ ] Create `PersonExpressionExtension/assets/` directory
- [ ] Create `PersonExpressionExtension/assets/placeholder.png` (copy from StaticImageExtension)

### Step 1.2: Create Extension Manifest
- [ ] Create `PersonExpressionExtension/manifest.json`
- [ ] Add required metadata fields
- [ ] Configure loading order (10)
- [ ] Set up file references (index.js, style.css)

### Step 1.3: Create Basic Settings UI
- [ ] Create `PersonExpressionExtension/settings.html`
- [ ] Add enable/disable checkbox
- [ ] Add position dropdown (top-right, top-left, bottom-right, bottom-left)
- [ ] Add width slider
- [ ] Add save settings button

### Step 1.4: Create Basic Styles
- [ ] Create `PersonExpressionExtension/style.css`
- [ ] Add panel container styles
- [ ] Add position-based positioning classes
- [ ] Add image styling

---

## Phase 2: Core Extension Structure (POC)

### Step 2.1: Create Main Extension File
- [ ] Create `PersonExpressionExtension/index.js`
- [ ] Import required modules (getContext, saveSettingsDebounced)
- [ ] Define extension name and folder path
- [ ] Define default settings object

### Step 2.2: Implement Settings Management
- [ ] Create `loadSettings()` function
- [ ] Initialize extension settings if not exists
- [ ] Apply defaults for missing keys
- [ ] Create `saveSettings()` function

### Step 2.3: Implement Panel Display
- [ ] Create `buildPanel()` function
- [ ] Create panel HTML structure
- [ ] Append panel to `#root`
- [ ] Cache DOM element references

### Step 2.4: Implement Settings UI Loading
- [ ] Create `loadSettingsUI()` function
- [ ] Load settings HTML from file
- [ ] Append to `#extensions_settings`

---

## Phase 3: Basic Event Handling (POC)

### Step 3.1: Setup Event Listeners
- [ ] Get eventSource and event_types from context
- [ ] Listen to `CHAT_CHANGED` event
- [ ] Listen to `MESSAGE_RECEIVED` event
- [ ] Listen to `GENERATION_STARTED` event

### Step 3.2: Implement Event Handlers
- [ ] Create `handleChatChanged()` function
- [ ] Get current character from context
- [ ] Call expression loading function
- [ ] Update panel display

### Step 3.3: Implement Expression Loading
- [ ] Create `loadExpressionForPersona(personaId)` function
- [ ] Load classification data from JSON file
- [ ] Get expression for persona
- [ ] Update panel display

---

## Phase 4: Basic Classification Integration (POC)

### Step 4.1: Create Classification Data File
- [ ] Create `data/classifications.json` (or use existing)
- [ ] Add sample persona entries
- [ ] Include expression paths for each persona

### Step 4.2: Implement Classification Loading
- [ ] Create `loadClassificationData()` function
- [ ] Fetch classification file
- [ ] Parse JSON response
- [ ] Return classification data

### Step 4.3: Implement Expression Retrieval
- [ ] Create `getExpressionForPersona(personaId, classificationData)` function
- [ ] Look up persona in classification data
- [ ] Return first expression or null

---

## Phase 5: Settings UI Integration (POC)

### Step 5.1: Setup Settings Event Listeners
- [ ] Add change listener for enable checkbox
- [ ] Add change listener for position dropdown
- [ ] Add input listener for width slider
- [ ] Add click listener for save button

### Step 5.2: Implement Settings Update Functions
- [ ] Create `updatePanelPosition(position)` function
- [ ] Create `updatePanelWidth(width)` function
- [ ] Apply settings to panel

### Step 5.3: Implement Settings Application
- [ ] Create `applySettings()` function
- [ ] Apply enabled state
- [ ] Apply position
- [ ] Apply width

---

## Phase 6: Initialization and Cleanup (POC)

### Step 6.1: Implement Initialization
- [ ] Create `init()` function
- [ ] Load settings
- [ ] Build panel
- [ ] Load settings UI
- [ ] Setup event listeners
- [ ] Apply settings
- [ ] Load initial expression

### Step 6.2: Setup DOM Ready Handler
- [ ] Add `$(document).ready(init)`
- [ ] Verify initialization order

### Step 6.3: Implement Cleanup
- [ ] Add `beforeunload` event listener
- [ ] Remove event listeners
- [ ] Clear timers
- [ ] Log cleanup completion

---

## Phase 7: Polish and Testing (POC)

### Step 7.1: Add Error Handling
- [ ] Wrap initialization in try-catch
- [ ] Add error logging
- [ ] Add user notifications

### Step 7.2: Add Logging
- [ ] Add console.log statements throughout
- [ ] Use consistent log prefix `[PersonExpression]`
- [ ] Log key events and state changes

### Step 7.3: Test Basic Functionality
- [ ] Test extension loads without errors
- [ ] Test settings persist across sessions
- [ ] Test panel displays in correct position
- [ ] Test panel size settings work
- [ ] Test persona changes trigger expression updates

---

## Phase 8: Enhanced Features (Post-POC)

### Step 8.1: Add Auto-Hide Functionality
- [ ] Add auto-hide checkbox to settings
- [ ] Add delay input to settings
- [ ] Implement idle timer
- [ ] Implement reset idle timer function
- [ ] Add mouse/keyboard event listeners

### Step 8.2: Add Expression Transitions
- [ ] Implement fade transitions
- [ ] Add transition duration setting
- [ ] Implement smooth image switching

### Step 8.3: Add Label Display
- [ ] Add label element to panel
- [ ] Add show label checkbox to settings
- [ ] Display persona name as label

### Step 8.4: Add Multiple Expressions
- [ ] Support multiple expressions per persona
- [ ] Implement expression cycling
- [ ] Add next/previous controls

---

## Phase 9: Advanced Features (Post-POC)

### Step 9.1: Enhanced Classification
- [ ] Support multiple classification sources
- [ ] Add manual expression assignment
- [ ] Add expression library management

### Step 9.2: Multi-Persona Support
- [ ] Support group chat expressions
- [ ] Position expressions relative to chat bubbles
- [ ] Add persona selector

### Step 9.3: Custom Sources
- [ ] Support URL-based expressions
- [ ] Add file browser integration
- [ ] Add expression preview

---

## Phase 10: Documentation and Distribution (Post-POC)

### Step 10.1: Create Documentation
- [ ] Create README.md
- [ ] Document installation instructions
- [ ] Document usage instructions
- [ ] Document settings
- [ ] Add troubleshooting section

### Step 10.2: Testing
- [ ] Test on different browsers
- [ ] Test on different screen sizes
- [ ] Test with multiple personas
- [ ] Test with group chats

### Step 10.3: Distribution
- [ ] Package extension for distribution
- [ ] Create installation instructions
- [ ] Submit to extension repository (optional)

---

## Implementation Notes

### POC Success Criteria

Before moving to enhanced features, ensure:

- [ ] Extension loads without errors
- [ ] Settings persist across sessions
- [ ] Panel displays in correct position
- [ ] Panel size settings work
- [ ] Persona changes trigger expression updates
- [ ] Missing expressions handled gracefully
- [ ] No performance degradation
- [ ] Event listeners cleaned up on unload

### Development Tips

1. **Test Incrementally**: Test each phase before moving to the next
2. **Use Console Logging**: Add console.log statements throughout
3. **Check Browser Console**: Monitor for errors during development
4. **Follow SillyTavern Patterns**: Use patterns from StaticImageExtension
5. **Document Changes**: Keep track of what you've implemented

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Extension not loading | Check manifest.json, file names, directory structure |
| Settings not persisting | Verify saveSettingsDebounced() is called |
| Panel not displaying | Check panel HTML appended to #root, CSS classes |
| Expressions not loading | Verify classification file path, JSON structure |
| Event listeners not working | Check event type constants, cleanup on unload |

---

## Conclusion

Follow this todo list in order to build a working Person Expression extension. Start with Phase 1 (Project Setup) and work through each phase systematically. The POC (Phases 1-7) should result in a functional extension with basic expression display for personas.

Once the POC is working, you can add enhanced features from Phase 8 onwards based on your needs and requirements.

Happy coding!
