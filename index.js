import { extension_settings, getContext } from '../../../scripts/extensions.js';
import { saveSettingsDebounced } from '../../../script.js';
import { event_types, eventSource } from '../../../scripts/events.js';

/**
 * Person Expression Extension
 * Displays persona expressions based on classification data
 */

// Default settings
const defaultSettings = {
    enabled: true,
    position: 'top-right',
    autoHide: true,
    autoHideDelay: 3000,
    width: 200,
    height: 200,
    classificationFile: 'person-expressions.json',
    showLabel: true,
};

// Extension state
let currentSettings = { ...defaultSettings };
let expressionData = {};
let expressionPanel = null;
let expressionImage = null;
let expressionLabel = null;
let autoHideTimeout = null;

/**
 * Load settings from extension_settings
 */
function loadSettings() {
    const loadedSettings = extension_settings.personExpression || {};
    currentSettings = { ...defaultSettings, ...loadedSettings };
    console.log('[Person Expression] Settings loaded:', currentSettings);
}

/**
 * Save settings to extension_settings
 */
function saveSettings() {
    extension_settings.personExpression = { ...currentSettings };
    saveSettingsDebounced();
    console.log('[Person Expression] Settings saved:', currentSettings);
}

/**
 * Update a setting value
 * @param {string} key - Setting key
 * @param {any} value - Setting value
 */
function updateSetting(key, value) {
    currentSettings[key] = value;
    saveSettings();
}

/**
 * Get a setting value
 * @param {string} key - Setting key
 * @returns {any} Setting value
 */
function getSetting(key) {
    return currentSettings[key];
}

/**
 * Load expression classification data from JSON file
 * @param {string} filename - Path to classification file
 * @returns {Promise<void>}
 */
async function loadClassification(filename) {
    try {
        const response = await fetch(`/scripts/extensions/PersonExpression/${filename}`);
        if (response.ok) {
            expressionData = await response.json();
            console.log('[Person Expression] Classification data loaded:', expressionData);
        } else {
            console.warn('[Person Expression] Classification file not found, using empty data:', filename);
            expressionData = {};
        }
    } catch (error) {
        console.error('[Person Expression] Error loading classification data:', error);
        expressionData = {};
    }
}

/**
 * Get expression for current persona
 * @returns {string|null} Expression image path or null
 */
function getCurrentExpression() {
    const context = getContext();
    const personaId = context.personaId;
    
    if (!personaId || !expressionData[personaId]) {
        return null;
    }
    
    const expressions = expressionData[personaId];
    if (!expressions || expressions.length === 0) {
        return null;
    }
    
    // Return first expression for POC
    return expressions[0];
}

/**
 * Show expression in the panel
 * @param {string} expressionPath - Path to expression image
 */
function showExpression(expressionPath) {
    if (!expressionImage || !expressionPanel) {
        return;
    }
    
    expressionImage.src = expressionPath;
    expressionPanel.classList.remove('hidden');
    
    // Reset auto-hide timer
    if (currentSettings.autoHide) {
        if (autoHideTimeout) {
            clearTimeout(autoHideTimeout);
        }
        autoHideTimeout = setTimeout(() => {
            expressionPanel.classList.add('hidden');
        }, currentSettings.autoHideDelay);
    }
    
    console.log('[Person Expression] Showing expression:', expressionPath);
}

/**
 * Hide the expression panel
 */
function hideExpression() {
    if (expressionPanel) {
        expressionPanel.classList.add('hidden');
    }
}

/**
 * Update expression panel position based on settings
 */
function updatePanelPosition() {
    if (!expressionPanel) {
        return;
    }
    
    // Remove all position classes
    expressionPanel.classList.remove(
        'person_expression_position-top-left',
        'person_expression_position-top-right',
        'person_expression_position-bottom-left',
        'person_expression_position-bottom-right'
    );
    
    // Add new position class
    const positionClass = `person_expression_position-${currentSettings.position}`;
    expressionPanel.classList.add(positionClass);
}

/**
 * Update expression panel size based on settings
 */
function updatePanelSize() {
    if (!expressionPanel) {
        return;
    }
    
    expressionPanel.style.width = `${currentSettings.width}px`;
    expressionPanel.style.height = `${currentSettings.height}px`;
}

/**
 * Update expression label visibility based on settings
 */
function updateLabelVisibility() {
    if (!expressionLabel) {
        return;
    }
    
    expressionLabel.style.display = currentSettings.showLabel ? 'block' : 'none';
}

/**
 * Handle persona change event
 */
async function handlePersonaChange() {
    if (!currentSettings.enabled) {
        return;
    }
    
    const expressionPath = getCurrentExpression();
    
    if (expressionPath) {
        showExpression(expressionPath);
    } else {
        hideExpression();
    }
}

/**
 * Handle message event
 */
async function handleMessageEvent() {
    if (!currentSettings.enabled) {
        return;
    }
    
    // Show expression when message is sent
    const expressionPath = getCurrentExpression();
    if (expressionPath) {
        showExpression(expressionPath);
    }
}

/**
 * Handle generation start event
 */
async function handleGenerationStart() {
    if (!currentSettings.enabled) {
        return;
    }
    
    // Hide expression during generation
    hideExpression();
}

/**
 * Handle generation end event
 */
async function handleGenerationEnd() {
    if (!currentSettings.enabled) {
        return;
    }
    
    // Show expression after generation
    const expressionPath = getCurrentExpression();
    if (expressionPath) {
        showExpression(expressionPath);
    }
}

/**
 * Build the expression panel DOM
 */
function buildExpressionPanel() {
    // Create panel container
    expressionPanel = document.createElement('div');
    expressionPanel.id = 'person_expression_panel';
    expressionPanel.className = 'hidden';
    
    // Create image element
    expressionImage = document.createElement('img');
    expressionImage.id = 'person_expression_image';
    expressionImage.alt = 'Person Expression';
    expressionPanel.appendChild(expressionImage);
    
    // Create label element
    expressionLabel = document.createElement('div');
    expressionLabel.id = 'person_expression_label';
    expressionLabel.textContent = 'Expression';
    expressionPanel.appendChild(expressionLabel);
    
    // Apply initial styles
    updatePanelPosition();
    updatePanelSize();
    updateLabelVisibility();
    
    // Add to document
    document.body.appendChild(expressionPanel);
    
    console.log('[Person Expression] Expression panel built');
}

/**
 * Initialize the extension
 */
async function initialize() {
    console.log('[Person Expression] Initializing...');
    
    // Load settings
    loadSettings();
    
    // Build expression panel
    buildExpressionPanel();
    
    // Load classification data
    await loadClassification(currentSettings.classificationFile);
    
    // Set initial expression
    await handlePersonaChange();
    
    // Register event listeners
    eventSource.on(event_types.PERSONA_CHANGED, handlePersonaChange);
    eventSource.on(event_types.MESSAGE_SENT, handleMessageEvent);
    eventSource.on(event_types.GENERATION_STARTED, handleGenerationStart);
    eventSource.on(event_types.GENERATION_ENDED, handleGenerationEnd);
    
    console.log('[Person Expression] Initialized successfully');
}

/**
 * Cleanup the extension
 */
function cleanup() {
    console.log('[Person Expression] Cleaning up...');
    
    // Remove event listeners
    eventSource.off(event_types.PERSONA_CHANGED, handlePersonaChange);
    eventSource.off(event_types.MESSAGE_SENT, handleMessageEvent);
    eventSource.off(event_types.GENERATION_STARTED, handleGenerationStart);
    eventSource.off(event_types.GENERATION_ENDED, handleGenerationEnd);
    
    // Clear auto-hide timeout
    if (autoHideTimeout) {
        clearTimeout(autoHideTimeout);
        autoHideTimeout = null;
    }
    
    // Remove expression panel from DOM
    if (expressionPanel && expressionPanel.parentNode) {
        expressionPanel.parentNode.removeChild(expressionPanel);
    }
    
    expressionPanel = null;
    expressionImage = null;
    expressionLabel = null;
    
    console.log('[Person Expression] Cleanup complete');
}

/**
 * Handle settings UI changes
 */
function onSettingsChange() {
    const enabled = document.getElementById('person_expression_enabled').checked;
    const position = document.getElementById('person_expression_position').value;
    const autoHide = document.getElementById('person_expression_autohide').checked;
    const autoHideDelay = parseInt(document.getElementById('person_expression_delay').value) || 3000;
    const width = parseInt(document.getElementById('person_expression_width').value) || 200;
    const height = parseInt(document.getElementById('person_expression_height').value) || 200;
    const classificationFile = document.getElementById('person_expression_classification_file').value;
    const showLabel = document.getElementById('person_expression_show_label').checked;
    
    updateSetting('enabled', enabled);
    updateSetting('position', position);
    updateSetting('autoHide', autoHide);
    updateSetting('autoHideDelay', autoHideDelay);
    updateSetting('width', width);
    updateSetting('height', height);
    updateSetting('classificationFile', classificationFile);
    updateSetting('showLabel', showLabel);
    
    // Update panel immediately
    updatePanelPosition();
    updatePanelSize();
    updateLabelVisibility();
}

/**
 * Add settings UI to the page
 */
async function addSettingsUI() {
    const settingsHTML = await fetch('/scripts/extensions/PersonExpression/settings.html')
        .then(response => response.text());
    
    const settingsContainer = document.getElementById('extensions_settings');
    if (settingsContainer) {
        const settingsDiv = document.createElement('div');
        settingsDiv.innerHTML = settingsHTML;
        settingsContainer.appendChild(settingsDiv);
        
        // Attach event listeners to settings elements
        document.getElementById('person_expression_enabled').addEventListener('change', onSettingsChange);
        document.getElementById('person_expression_position').addEventListener('change', onSettingsChange);
        document.getElementById('person_expression_autohide').addEventListener('change', onSettingsChange);
        document.getElementById('person_expression_delay').addEventListener('input', onSettingsChange);
        document.getElementById('person_expression_width').addEventListener('input', onSettingsChange);
        document.getElementById('person_expression_height').addEventListener('input', onSettingsChange);
        document.getElementById('person_expression_classification_file').addEventListener('change', onSettingsChange);
        document.getElementById('person_expression_show_label').addEventListener('change', onSettingsChange);
        
        // Initialize settings UI from current settings
        document.getElementById('person_expression_enabled').checked = currentSettings.enabled;
        document.getElementById('person_expression_position').value = currentSettings.position;
        document.getElementById('person_expression_autohide').checked = currentSettings.autoHide;
        document.getElementById('person_expression_delay').value = currentSettings.autoHideDelay;
        document.getElementById('person_expression_width').value = currentSettings.width;
        document.getElementById('person_expression_height').value = currentSettings.height;
        document.getElementById('person_expression_classification_file').value = currentSettings.classificationFile;
        document.getElementById('person_expression_show_label').checked = currentSettings.showLabel;
        
        console.log('[Person Expression] Settings UI added');
    }
}

// Initialize extension when DOM is ready
jQuery(async () => {
    console.log('[Person Expression] Extension loaded');
    
    // Add settings UI
    await addSettingsUI();
    
    // Initialize extension
    await initialize();
});

// Export cleanup function for extension system
globalThis.PersonExpressionCleanup = cleanup;

// Export for extension system
globalThis.PersonExpressionExtension = {
    initialize,
    cleanup,
    loadSettings,
    saveSettings,
    updateSetting,
    getSetting,
    loadClassification,
    getCurrentExpression,
    showExpression,
    hideExpression,
    updatePanelPosition,
    updatePanelSize,
    updateLabelVisibility,
    handlePersonaChange,
    handleMessageEvent,
    handleGenerationStart,
    handleGenerationEnd,
    buildExpressionPanel,
    onSettingsChange,
    addSettingsUI,
};

console.log('[Person Expression] Extension module exported');
