import { characters, eventSource, event_types, generateQuietPrompt, generateRaw, getRequestHeaders, online_status, saveSettingsDebounced, substituteParams, substituteParamsExtended, system_message_types, name1 } from '../../../../script.js';
import { dragElement, isMobile } from '../../../../scripts/RossAscends-mods.js';
import { getContext, getApiUrl, modules, extension_settings, ModuleWorkerWrapper, doExtrasFetch } from '../../../../scripts/extensions.js';
import { loadMovingUIState, performFuzzySearch, power_user } from '../../../../scripts/power-user.js';
import { onlyUnique, debounce, trimToEndSentence, trimToStartSentence, waitUntilCondition, findChar } from '../../../../scripts/utils.js';
import { debounce_timeout } from '../../../../scripts/constants.js';
import { SlashCommandParser } from '../../../../scripts/slash-commands/SlashCommandParser.js';
import { SlashCommand } from '../../../../scripts/slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument, SlashCommandNamedArgument } from '../../../../scripts/slash-commands/SlashCommandArgument.js';
import { SlashCommandEnumValue, enumTypes } from '../../../../scripts/slash-commands/SlashCommandEnumValue.js';
import { slashCommandReturnHelper } from '../../../../scripts/slash-commands/SlashCommandReturnHelper.js';
import { t } from '../../../../scripts/i18n.js';
import { user_avatar } from '../../../../scripts/personas.js';

export { MODULE_NAME };

// ============================================
// DEBUGGING CONFIGURATION
// ============================================
const DEBUG = false; // Set to false in production

function debug(...args) {
    if (DEBUG) console.log('[Persona Expressions]', ...args);
}

function debugError(...args) {
    if (DEBUG) console.error('[Persona Expressions]', ...args);
}

function debugWarn(...args) {
    if (DEBUG) console.warn('[Persona Expressions]', ...args);
}

const MODULE_NAME = 'third-party/persona-expressions';
const EXTENSION_KEY = 'persona-expressions';
const EXTENSION_FOLDER = `scripts/extensions/${MODULE_NAME}`;
const UPDATE_INTERVAL = 2000;
const STREAMING_UPDATE_INTERVAL = 10000;
const DEFAULT_FALLBACK_EXPRESSION = 'neutral';
const DEFAULT_MESSAGES_TO_ANALYZE = 3;
const DEFAULT_LLM_PROMPT = 'Ignore previous instructions. Classify the emotion of the last message. Output just one word, e.g. "joy" or "anger". Choose only one of the following labels: {{labels}}';

const DEFAULT_EXPRESSIONS = [
    'admiration', 'amusement', 'anger', 'annoyance', 'approval', 'caring',
    'confusion', 'curiosity', 'desire', 'disappointment', 'disapproval', 'disgust',
    'embarrassment', 'excitement', 'fear', 'gratitude', 'grief', 'joy', 'love',
    'nervousness', 'optimism', 'pride', 'realization', 'relief', 'remorse',
    'sadness', 'surprise', 'neutral',
];

const OPTION_NO_FALLBACK = '#none';
const OPTION_EMOJI_FALLBACK = '#emoji';
const RESET_SPRITE_LABEL = '#reset';

const EXPRESSION_API = {
    local: 0,
    extras: 1,
    llm: 2,
    webllm: 3,
    none: 99,
};

const PROMPT_TYPE = {
    raw: 'raw',
    full: 'full',
};

let expressionsList = null;
let lastAvatarId = undefined;
let lastUserMessage = null;
let spriteCache = {};
let inApiCall = false;
let lastServerResponseTime = 0;

export let lastExpression = {};

function getSettings() {
    return extension_settings[EXTENSION_KEY] || {};
}

function getPlaceholderImage(expression, isCustom = false) {
    return {
        expression: expression,
        isCustom: isCustom,
        title: 'No Image',
        type: 'failure',
        fileName: 'No-Image-Placeholder.svg',
        imageSrc: '/img/No-Image-Placeholder.svg',
    };
}

function getPersonaSpriteFolderName() {
    const settings = getSettings();
    // Use the avatar ID (user_avatar) as the folder name base, strip extension
    const avatarId = getCurrentAvatarId();
    if (!avatarId) return '';
    const personaSettings = settings.persona_settings?.[avatarId];
    if (personaSettings?.spriteFolder) {
        return `persona_${personaSettings.spriteFolder}`;
    }
    // Strip file extension from avatar ID for folder name
    const folderName = avatarId.replace(/\.[^/.]+$/, '');
    return `persona_${folderName}`;
}

function getCurrentPersonaName() {
    // Returns the display name of the current persona
    const context = getContext();
    if (context.name1) {
        return context.name1;
    }
    const displayName = power_user.personas[user_avatar];
    if (displayName) {
        return displayName;
    }
    return name1 || 'default';
}

function getPersonaNameForDisplay() {
    // Returns the display name for UI
    const displayName = power_user.personas[user_avatar];
    if (displayName) {
        return displayName;
    }
    return name1 || 'Default Persona';
}

function getCurrentAvatarId() {
    // Returns the avatar ID (file name) used for sprite folder
    return user_avatar || '';
}

async function moduleWorker({ newChat = false } = {}) {
    const context = getContext();
    const settings = getSettings();
    const avatarId = getCurrentAvatarId();
    const spriteFolderName = getPersonaSpriteFolderName();

    debug('moduleWorker running', { 
        newChat, 
        avatarId, 
        spriteFolderName, 
        hasCache: Object.keys(spriteCache).length > 0,
        spriteCacheKeys: Object.keys(spriteCache),
        lastUserMessage: lastUserMessage?.substring(0, 50),
        enabled: settings.enabled,
        hasSettings: !!extension_settings[EXTENSION_KEY]
    });

    if (!settings.enabled) {
        debug('Extension is disabled, removing expression');
        removeExpression();
        return;
    }

    if (!avatarId || avatarId.includes('user-default')) {
        debug('Invalid avatar ID, removing expression', { avatarId });
        removeExpression();
        return;
    }

    // persona/avatar has no expressions or it is not loaded
    if (Object.keys(spriteCache).length === 0) {
        debug('No cache found, validating images', { spriteFolderName });
        await validateImages(spriteFolderName);
        lastAvatarId = avatarId;
    }

    const offlineMode = $('.persona_expression_settings .offline_mode');
    if (!modules.includes('classify') && settings.api === EXPRESSION_API.extras) {
        debug('Offline mode - classify module not available', { api: settings.api });
        offlineMode.css('display', 'block');
        lastAvatarId = avatarId;
        return;
    } else {
        if (offlineMode.is(':visible')) {
            debug('Refreshing expressions and cache');
            expressionsList = null;
            spriteCache = {};
            expressionsList = await getExpressionsList();
            await validateImages(spriteFolderName, true);
        }
        offlineMode.css('display', 'none');
    }

    // Get the last user message
    const currentLastMessage = getLastUserMessage();
    
    // Check if avatar or message changed
    const messageChanged = !((lastAvatarId === avatarId) && lastUserMessage === currentLastMessage);

    if (!messageChanged) {
        debug('No changes detected, skipping worker');
        return;
    }

    debug('Changes detected, processing', { 
        avatarChanged: lastAvatarId !== avatarId,
        messageChanged: lastUserMessage !== currentLastMessage,
        currentLastMessage: currentLastMessage?.substring(0, 50)
    });

    if (context.streamingProcessor && !context.streamingProcessor.isFinished && settings.api === EXPRESSION_API.llm) {
        debug('LLM streaming in progress, skipping');
        return;
    }

    if (inApiCall) {
        debug('Classification API is busy, skipping');
        return;
    }

    if (!context.streamingProcessor?.isFinished) {
        const now = Date.now();
        const timeSinceLastResponse = now - lastServerResponseTime;
        if (timeSinceLastResponse < STREAMING_UPDATE_INTERVAL) {
            debug('Streaming in progress, throttling expression update', { timeSinceLastResponse });
            return;
        }
    }

    try {
        inApiCall = true;
        debug('Getting expression label for message', { currentLastMessage: currentLastMessage?.substring(0, 50) });
        const expression = await getExpressionLabel(currentLastMessage || '');
        debug('Expression label obtained', { expression });

        debug('Setting expression', { spriteFolderName, expression });
        await sendExpressionCall(spriteFolderName, expression, { force: false });
    } catch (error) {
        debugError('Error in moduleWorker', error);
        console.log(error);
    } finally {
        inApiCall = false;
        lastAvatarId = avatarId;
        lastUserMessage = currentLastMessage;
        lastServerResponseTime = Date.now();
    }
}

function getLastUserMessage() {
    const context = getContext();
    if (!context.chat || context.chat.length === 0) {
        return null;
    }
    // Find the last user message
    for (let i = context.chat.length - 1; i >= 0; i--) {
        const mes = context.chat[i];
        if (mes.is_user && mes.mes) {
            return mes.mes;
        }
    }
    return null;
}

function getUserMessagesForClassification() {
    const context = getContext();
    const settings = getSettings();
    const messagesToAnalyze = settings.messagesToAnalyze || DEFAULT_MESSAGES_TO_ANALYZE;
    const userMessages = [];

    const reversedChat = context.chat.slice().reverse();
    for (const mes of reversedChat) {
        if (mes.is_user && mes.mes) {
            userMessages.push(mes.mes);
            if (userMessages.length >= messagesToAnalyze) {
                break;
            }
        }
    }

    return userMessages.reverse();
}

async function getExpressionLabel(text, expressionsApi, options = {}) {
    const settings = getSettings();
    expressionsApi = expressionsApi ?? settings.api ?? EXPRESSION_API.local;
    if (!text || (!modules.includes('classify') && expressionsApi === EXPRESSION_API.extras)) {
        return settings.fallback_expression || DEFAULT_FALLBACK_EXPRESSION;
    }

    text = sampleClassifyText(text);

    try {
        switch (expressionsApi) {
            case EXPRESSION_API.local: {
                const localResult = await fetch('/api/extra/classify', {
                    method: 'POST',
                    headers: getRequestHeaders(),
                    body: JSON.stringify({ text: text }),
                });
                if (localResult.ok) {
                    const data = await localResult.json();
                    return data.classification[0].label;
                }
            } break;
            case EXPRESSION_API.extras: {
                const url = new URL(getApiUrl());
                url.pathname = '/api/classify';
                const extrasResult = await doExtrasFetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'bypass' },
                    body: JSON.stringify({ text: text }),
                });
                if (extrasResult.ok) {
                    const data = await extrasResult.json();
                    return data.classification[0].label;
                }
            } break;
            case EXPRESSION_API.none:
                return '';
            default:
                return settings.fallback_expression || DEFAULT_FALLBACK_EXPRESSION;
        }
    } catch (error) {
        console.error(error);
        return settings.fallback_expression || DEFAULT_FALLBACK_EXPRESSION;
    }
}

function sampleClassifyText(text) {
    if (!text) return text;
    let result = substituteParams(text).replace(/[*"]/g, '');
    const SAMPLE_THRESHOLD = 500;
    const HALF_SAMPLE_THRESHOLD = SAMPLE_THRESHOLD / 2;
    if (text.length < SAMPLE_THRESHOLD) {
        result = trimToEndSentence(result);
    } else {
        result = trimToEndSentence(result.slice(0, HALF_SAMPLE_THRESHOLD)) + ' ' + trimToStartSentence(result.slice(-HALF_SAMPLE_THRESHOLD));
    }
    return result.trim();
}

export async function sendExpressionCall(spriteFolderName, expression, { force = false, overrideSpriteFile = null } = {}) {
    lastExpression[spriteFolderName] = expression;
    setExpression(spriteFolderName, expression, { force, overrideSpriteFile });
}

async function setExpression(spriteFolderName, expression, { force = false, overrideSpriteFile = null } = {}) {
    debug('setExpression called', { spriteFolderName, expression, force, overrideSpriteFile });
    const settings = getSettings();
    await validateImages(spriteFolderName);
    
    const img = $('img.persona_expression');
    debug('Found image element', { imgExists: !!img, imgSrc: img.attr('src'), imgExpression: img.attr('data-expression') });
    
    const prevExpressionSrc = img.attr('src');
    const prevExpression = img.attr('data-expression');
    const expressionClone = img.clone();

    // Don't reset sprite if same expression is already set (unless force)
    if (!force && prevExpression === expression && prevExpressionSrc) {
        debug('Expression already set, skipping update', { expression, prevExpressionSrc });
        document.getElementById('persona_expression-holder').style.display = '';
        return;
    }

    debug('Choosing sprite for expression');
    const spriteFile = chooseSpriteForExpression(spriteFolderName, expression, { prevExpressionSrc, overrideSpriteFile });
    debug('Sprite file result', { spriteFound: !!spriteFile, spriteFile: spriteFile?.fileName, spriteFileSrc: spriteFile?.imageSrc });

    if (spriteFile) {
        debug('Sprite found, checking if animation needed', { prevExpressionSrc, newSrc: spriteFile.imageSrc, isAnimating: img.hasClass('persona_expression-animating') });
        
        if (prevExpressionSrc !== spriteFile.imageSrc && !img.hasClass('persona_expression-animating')) {
            debug('Starting sprite animation', { spriteSrc: spriteFile.imageSrc, fileName: spriteFile.fileName, expression: spriteFile.expression });
            
            expressionClone.addClass('persona_expression-clone');
            expressionClone.attr('id', '').css({ opacity: 0 });
            expressionClone.attr('src', spriteFile.imageSrc);
            expressionClone.attr('data-sprite-folder-name', spriteFolderName);
            expressionClone.attr('data-expression', expression);
            expressionClone.attr('data-sprite-filename', spriteFile.fileName);
            expressionClone.attr('title', expression);
            expressionClone.appendTo($('#persona_expression-holder'));

            const duration = 200;
            img.addClass('persona_expression-animating');

            const imgWidth = img.width();
            const imgHeight = img.height();
            const expressionHolder = img.parent();
            expressionHolder.css('min-width', imgWidth > 100 ? imgWidth : 100);
            expressionHolder.css('min-height', imgHeight > 100 ? imgHeight : 100);

            img.css('position', 'absolute').width(imgWidth).height(imgHeight);
            expressionClone.addClass('persona_expression-animating');
            expressionClone.css({ opacity: 0 }).animate({ opacity: 1 }, duration).promise().done(function () {
                debug('Animation complete, cleaning up');
                img.animate({ opacity: 0 }, duration);
                img.remove();
                expressionClone.attr('id', 'persona_expression-image');
                expressionClone.removeClass('persona_expression-animating');
                expressionHolder.css('min-width', 100);
                expressionHolder.css('min-height', 100);
            });

            expressionClone.removeClass('persona_expression-clone');
            expressionClone.removeClass('default');
            expressionClone.off('error');
            expressionClone.on('error', function () {
                debugError('Image failed to load', { src: $(this).attr('src') });
                $(this).attr('src', '');
                $(this).off('error');
            });
        }
        console.info('Persona expression set', { expression: spriteFile.expression, file: spriteFile.fileName });
    } else {
        debug('No sprite found, checking if we should update with fallback', { hasPrevSrc: !!prevExpressionSrc, force });
        
        // Only update if there's no existing sprite or force is set
        if (!prevExpressionSrc || force) {
            debug('Updating with fallback/none');
            img.attr('data-sprite-folder-name', spriteFolderName);
            if (settings.showDefault && expression !== RESET_SPRITE_LABEL) {
                debug('Setting default emoji', { emoji: expression });
                setDefaultEmojiForImage(img, expression);
            } else {
                debug('Setting none (empty src)');
                setNoneForImage(img, expression);
            }
        } else {
            debug('Not updating, skipping');
        }
    }
    
    const holder = document.getElementById('persona_expression-holder');
    debug('Setting holder display to visible', { holderExists: !!holder });
    if (holder) {
        holder.style.display = '';
    }
}

function setDefaultEmojiForImage(img, expression) {
    const settings = getSettings();
    if (settings.custom?.includes(expression)) {
        expression = DEFAULT_FALLBACK_EXPRESSION;
    }
    const defImgUrl = `/img/default-expressions/${expression}.png`;
    img.attr('src', defImgUrl);
    img.attr('data-expression', expression);
    img.addClass('default');
}

function setNoneForImage(img, expression) {
    img.attr('src', '');
    img.attr('data-expression', expression);
    img.removeClass('default');
}

function chooseSpriteForExpression(spriteFolderName, expression, { prevExpressionSrc = null, overrideSpriteFile = null } = {}) {
    debug('chooseSpriteForExpression called', { spriteFolderName, expression, overrideSpriteFile, prevExpressionSrc });
    const settings = getSettings();
    if (!spriteCache[spriteFolderName]) {
        debug('No cache found for spriteFolderName', { spriteFolderName });
        return null;
    }
    if (expression === RESET_SPRITE_LABEL) {
        debug('Reset sprite requested');
        return null;
    }

    let sprite = spriteCache[spriteFolderName].find(x => x.label === expression);
    debug('Finding sprite for expression', { expression, spriteFound: !!sprite, cacheLabels: spriteCache[spriteFolderName].map(x => x.label) });
    
    if (!(sprite?.files.length > 0) && settings.fallback_expression) {
        debug('Primary sprite not found, trying fallback', { fallback: settings.fallback_expression });
        sprite = spriteCache[spriteFolderName].find(x => x.label === settings.fallback_expression);
        debug('Fallback sprite found', { fallbackFound: !!sprite });
    }
    if (!(sprite?.files.length > 0)) {
        debug('No sprite found for expression or fallback', { expression, fallback: settings.fallback_expression });
        return null;
    }

    let spriteFile = sprite.files[0];

    if (overrideSpriteFile) {
        debug('Override sprite file specified', { overrideSpriteFile });
        const searched = sprite.files.find(x => x.fileName === overrideSpriteFile);
        if (searched) {
            spriteFile = searched;
            debug('Override sprite found', { spriteFile: spriteFile.fileName });
        } else {
            debug('Override sprite not found in files', { overrideSpriteFile, availableFiles: sprite.files.map(x => x.fileName) });
        }
    } else if (settings.allowMultiple && sprite.files.length > 1) {
        debug('Multiple sprites available, choosing randomly', { totalFiles: sprite.files.length, rerollIfSame: settings.rerollIfSame });
        let possibleFiles = sprite.files;
        if (settings.rerollIfSame) {
            debug('Filtering out previous sprite', { prevExpressionSrc });
            possibleFiles = possibleFiles.filter(x => !prevExpressionSrc || x.imageSrc !== prevExpressionSrc);
            debug('Possible files after filtering', { count: possibleFiles.length, files: possibleFiles.map(x => x.fileName) });
        }
        spriteFile = possibleFiles[Math.floor(Math.random() * possibleFiles.length)];
        debug('Random sprite selected', { selectedFile: spriteFile.fileName });
    }

    debug('Sprite selection complete', { spriteFile: spriteFile?.fileName, spriteFileExpression: spriteFile?.expression });
    return spriteFile;
}

async function validateImages(spriteFolderName, forceRedrawCached = false) {
    debug('validateImages called', { spriteFolderName, forceRedrawCached, hasCache: !!spriteCache[spriteFolderName], cacheKeys: Object.keys(spriteCache) });
    const labels = await getExpressionsList();

    if (spriteCache[spriteFolderName]) {
        debug('Cache found for spriteFolderName', { spriteFolderName, cacheCount: spriteCache[spriteFolderName].length });
        if (forceRedrawCached && $('#persona_image_list').data('name') !== spriteFolderName) {
            debug('Forced redraw requested');
            await drawSpritesList(spriteFolderName, labels, spriteCache[spriteFolderName]);
        }
        return;
    }

    if (!spriteFolderName) {
        debug('No sprite folder name provided, drawing empty list');
        await drawSpritesList('', labels, []);
        return;
    }

    debug('Cache not found, fetching sprites from API', { spriteFolderName });
    const sprites = await getSpritesList(spriteFolderName);
    debug('Sprites fetched', { spriteFolderName, spritesCount: sprites.length });
    spriteCache[spriteFolderName] = await drawSpritesList(spriteFolderName, labels, sprites);
    debug('Cache populated', { spriteFolderName, cacheCount: spriteCache[spriteFolderName].length });
}

async function drawSpritesList(spriteFolderName, labels, sprites) {
    const settings = getSettings();
    let validExpressions = [];

    if (!spriteFolderName) {
        $('#persona_open_chat_expressions').hide();
        $('#persona_no_chat_expressions').show();
        return [];
    }

    $('#persona_no_chat_expressions').hide();
    $('#persona_open_chat_expressions').show();
    $('#persona_image_list').empty();
    $('#persona_image_list').data('name', spriteFolderName);
    const displayName = getPersonaNameForDisplay();
    $('#persona_image_list_header_name').text(displayName);

    if (!Array.isArray(labels)) return [];

    for (const expression of labels.sort()) {
        const isCustom = settings.custom?.includes(expression);
        const images = sprites.filter(s => s.label === expression).map(s => s.files).flat();

        if (images.length === 0) {
            const listItem = await getListItem(expression, { isCustom, images: [getPlaceholderImage(expression, isCustom)] });
            $('#persona_image_list').append(listItem);
            continue;
        }

        validExpressions.push({ label: expression, files: images });
        const listItem = await getListItem(expression, { isCustom, images });
        $('#persona_image_list').append(listItem);
    }
    return validExpressions;
}

async function getListItem(expression, { images, isCustom = false } = {}) {
    try {
        const response = await fetch(`${EXTENSION_FOLDER}/templates/list-item.html`);
        if (!response.ok) {
            console.error('Failed to load list-item template');
            return '';
        }
        const template = await response.text();
        return renderTemplate(template, { expression, images, isCustom });
    } catch (error) {
        console.error('Error loading list-item template:', error);
        return '';
    }
}

function renderTemplate(templateString, data) {
    const template = Handlebars.compile(templateString);
    return template(data);
}

async function getSpritesList(name) {
    debug('getSpritesList called', { name });
    try {
        const result = await fetch(`/api/sprites/get?name=${encodeURIComponent(name)}`);
        debug('API response received', { name, status: result.status, ok: result.ok });
        let sprites = result.ok ? (await result.json()) : [];
        debug('Sprites parsed', { name, spritesCount: sprites.length });

        const grouped = sprites.reduce((acc, sprite) => {
            const imageData = getExpressionImageData(sprite);
            let existingExpression = acc.find(exp => exp.label === sprite.label);
            if (existingExpression) {
                existingExpression.files.push(imageData);
            } else {
                acc.push({ label: sprite.label, files: [imageData] });
            }
            return acc;
        }, []);

        debug('Sprites grouped by expression', { name, groupedCount: grouped.length });

        for (const expression of grouped) {
            expression.files.sort((a, b) => {
                if (a.title === expression.label) return -1;
                if (b.title === expression.label) return 1;
                return a.title.localeCompare(b.title);
            });
            for (let i = 1; i < expression.files.length; i++) {
                expression.files[i].type = 'additional';
            }
        }
        debug('getSpritesList complete', { name, totalFiles: grouped.reduce((acc, exp) => acc + exp.files.length, 0) });
        return grouped;
    } catch (err) {
        debugError('Error in getSpritesList', err);
        console.log(err);
        return [];
    }
}

function getExpressionImageData(sprite) {
    const settings = getSettings();
    const fileName = sprite.path.split('/').pop().split('?')[0];
    const fileNameWithoutExtension = fileName.replace(/\.[^/.]+$/, '');
    return {
        expression: sprite.label,
        fileName: fileName,
        title: fileNameWithoutExtension,
        imageSrc: sprite.path,
        type: 'success',
        isCustom: settings.custom?.includes(sprite.label),
    };
}

export async function getExpressionsList() {
    if (!Array.isArray(expressionsList)) {
        expressionsList = await resolveExpressionsList();
    }
    const settings = getSettings();
    return [...expressionsList, ...(settings.custom || [])].filter(onlyUnique);

    async function resolveExpressionsList() {
        const settings = getSettings();
        try {
            if (settings.api === EXPRESSION_API.extras && modules.includes('classify')) {
                const url = new URL(getApiUrl());
                url.pathname = '/api/classify/labels';
                const apiResult = await doExtrasFetch(url, { method: 'GET', headers: { 'Bypass-Tunnel-Reminder': 'bypass' } });
                if (apiResult.ok) {
                    const data = await apiResult.json();
                    expressionsList = data.labels;
                    return expressionsList;
                }
            }
            if (settings.api === EXPRESSION_API.local) {
                const apiResult = await fetch('/api/extra/classify/labels', {
                    method: 'POST',
                    headers: getRequestHeaders({ omitContentType: true }),
                });
                if (apiResult.ok) {
                    const data = await apiResult.json();
                    expressionsList = data.labels;
                    return expressionsList;
                }
            }
        } catch (error) {
            console.log(error);
        }
        expressionsList = DEFAULT_EXPRESSIONS.slice();
        return expressionsList;
    }
}

function applyUISettings() {
    const settings = getSettings();
    const holder = $('#persona_expression-holder');
    const img = $('img.persona_expression');
    
    // Reset position classes
    holder.removeClass('position-top-left position-top-right position-bottom-left position-bottom-right');
    
    // Apply position
    if (settings.position) {
        holder.addClass(`position-${settings.position}`);
    }
    
    // Apply size
    const size = settings.size || 200;
    holder.css('--persona-expression-size', `${size}px`);
    img.css('--persona-expression-size', `${size}px`);
    
    // Apply opacity
    const opacity = (settings.opacity || 100) / 100;
    img.css('opacity', opacity);
}

function removeExpression() {
    lastUserMessage = null;
    $('img.persona_expression').off('error');
    $('img.persona_expression').prop('src', '');
    $('img.persona_expression').removeClass('default');
}

async function onClickPersonaExpressionUpload(event) {
    event.stopPropagation();
    const expressionListItem = $(this).closest('.persona_expression_list_item');
    const clickedFileName = expressionListItem.attr('data-expression-type') !== 'failure' ? expressionListItem.attr('data-filename') : null;
    const expression = expressionListItem.data('expression');
    const name = $('#persona_image_list').data('name');

    const handleExpressionUploadChange = async (e) => {
        const file = e.target.files[0];
        if (!file || !file.name) return;

        const spriteName = withoutExtension(file.name);
        const formData = new FormData();
        formData.append('name', name);
        formData.append('label', expression);
        formData.append('avatar', file);
        formData.append('spriteName', spriteName);

        await handleFileUpload('/api/sprites/upload', formData);
        e.target.form.reset();
    };

    $('#persona_expression_upload').off('change').on('change', handleExpressionUploadChange).trigger('click');
}

async function onClickPersonaExpressionDelete(event) {
    event.stopPropagation();
    const expressionListItem = $(this).closest('.persona_expression_list_item');
    const expression = expressionListItem.data('expression');
    if (expressionListItem.attr('data-expression-type') === 'failure') return;

    const confirmed = confirm(`Delete expression "${expression}"?`);
    if (!confirmed) return;

    const fileName = withoutExtension(expressionListItem.attr('data-filename'));
    const name = $('#persona_image_list').data('name');

    try {
        await fetch('/api/sprites/delete', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({ name, label: expression, spriteName: fileName }),
        });
    } catch (error) {
        toastr.error('Failed to delete image.');
    }

    delete spriteCache[name];
    await validateImages(name);
}

async function handleFileUpload(url, formData) {
    try {
        const result = await fetch(url, {
            method: 'POST',
            headers: getRequestHeaders({ omitContentType: true }),
            body: formData,
            cache: 'no-cache',
        });
        if (!result.ok) throw new Error(`Upload failed with status ${result.status}`);
        const data = await result.json();
        const name = formData.get('name').toString();
        delete spriteCache[name];
        await validateImages(name, true);
        return data;
    } catch (error) {
        console.error('Error uploading image:', error);
        toastr.error('Failed to upload image');
        return {};
    }
}

function withoutExtension(fileName) {
    return fileName.replace(/\.[^/.]+$/, '');
}

async function onClickPersonaExpressionUploadPackButton() {
    const name = $('#persona_image_list').data('name');
    const handleFileUploadChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('name', name);
        formData.append('avatar', file);

        const uploadToast = toastr.info('Please wait...', 'Upload is processing', { timeOut: 0, extendedTimeOut: 0 });
        const { count } = await handleFileUpload('/api/sprites/upload-zip', formData);
        toastr.clear(uploadToast);

        if (count) {
            toastr.success(`Uploaded ${count} image(s) for ${name}`);
        }
        e.target.form.reset();
    };

    $('#persona_expression_upload_pack').off('change').on('change', handleFileUploadChange).trigger('click');
}

async function onPersonaChanged(personaName) {
    const settings = getSettings();
    if (!settings.enabled) return;

    lastUserMessage = null;
    lastAvatarId = null;
    spriteCache = {};

    const spriteFolderName = getPersonaSpriteFolderName();
    await validateImages(spriteFolderName, true);

    const lastMessage = getLastUserMessage();
    if (lastMessage && spriteFolderName) {
        const expression = await getExpressionLabel(lastMessage);
        await sendExpressionCall(spriteFolderName, expression, { force: true });
    }
}

function onClickExpressionImage() {
    const spriteFile = $(this).attr('data-filename');
    const label = $(this).closest('.persona_expression_list_item').data('expression');
    const currentPersona = getCurrentPersonaName();
    const spriteFolderName = getPersonaSpriteFolderName();
    sendExpressionCall(spriteFolderName, label, { force: true, overrideSpriteFile: spriteFile });
}

function migrateSettings() {
    if (!extension_settings[EXTENSION_KEY]) {
        extension_settings[EXTENSION_KEY] = {};
    }
    const settings = extension_settings[EXTENSION_KEY];
    debug('migrateSettings: Loading existing settings', { hasSettings: !!extension_settings[EXTENSION_KEY], settings });
    
    if (settings.api === undefined) settings.api = EXPRESSION_API.local;
    if (!Array.isArray(settings.custom)) settings.custom = [];
    if (settings.fallback_expression === undefined) settings.fallback_expression = DEFAULT_FALLBACK_EXPRESSION;
    if (settings.messagesToAnalyze === undefined) settings.messagesToAnalyze = DEFAULT_MESSAGES_TO_ANALYZE;
    if (settings.allowMultiple === undefined) settings.allowMultiple = true;
    if (settings.rerollIfSame === undefined) settings.rerollIfSame = true;
    if (settings.enabled === undefined) settings.enabled = true; // Set default for enabled
    if (!settings.persona_settings) settings.persona_settings = {};
    if (settings.position === undefined) settings.position = 'bottom-right';
    if (settings.size === undefined) settings.size = 200;
    if (settings.opacity === undefined) settings.opacity = 100;
    
    debug('migrateSettings: Settings migrated', { enabled: settings.enabled, api: settings.api });
    saveSettingsDebounced();
}

async function renderAdditionalExpressionSettings() {
    renderCustomExpressions();
    await renderFallbackExpressionPicker();
}

function renderCustomExpressions() {
    const settings = getSettings();
    const customExpressions = (settings.custom || []).sort((a, b) => a.localeCompare(b));
    $('#persona_expression_custom').empty();
    for (const expression of customExpressions) {
        const option = document.createElement('option');
        option.value = expression;
        option.text = expression;
        $('#persona_expression_custom').append(option);
    }
    if (customExpressions.length === 0) {
        $('#persona_expression_custom').append('<option value="" disabled selected>[ No custom expressions ]</option>');
    }
}

async function renderFallbackExpressionPicker() {
    const settings = getSettings();
    const expressions = await getExpressionsList();
    const defaultPicker = $('#persona_expression_fallback');
    defaultPicker.empty();

    addOption(OPTION_NO_FALLBACK, '[ No fallback ]', !settings.fallback_expression && !settings.showDefault);
    addOption(OPTION_EMOJI_FALLBACK, '[ Default emojis ]', !!settings.showDefault);

    for (const expression of expressions) {
        addOption(expression, expression, expression === settings.fallback_expression);
    }

    function addOption(value, label, isSelected) {
        const option = document.createElement('option');
        option.value = value;
        option.text = label;
        option.selected = isSelected;
        defaultPicker.append(option);
    }
}

function getCachedExpressions() {
    const settings = getSettings();
    if (!Array.isArray(expressionsList)) return [];
    return [...expressionsList, ...(settings.custom || [])].filter(onlyUnique);
}

async function setSpriteSlashCommand({ type }, searchTerm) {
    type ??= 'expression';
    searchTerm = searchTerm.trim().toLowerCase();
    if (!searchTerm) {
        toastr.error(t`No expression or sprite name provided`, t`Set Sprite`);
        return '';
    }

    const currentPersona = getCurrentPersonaName();
    const spriteFolderName = getPersonaSpriteFolderName();
    let label = searchTerm;
    let spriteFile = null;

    await validateImages(spriteFolderName);

    if (searchTerm === RESET_SPRITE_LABEL) {
        await sendExpressionCall(spriteFolderName, label, { force: true });
        return lastExpression[spriteFolderName] ?? '';
    }

    switch (type) {
        case 'expression': {
            const existingExpressions = getCachedExpressions().map(x => ({ label: x }));
            const results = performFuzzySearch('persona-expression-expressions', existingExpressions, [{ name: 'label', weight: 1 }], searchTerm);
            const matchedExpression = results[0]?.item;
            if (!matchedExpression) {
                toastr.warning(t`No expression found for search term ${searchTerm}`, t`Set Sprite`);
                return '';
            }
            label = matchedExpression.label;
            break;
        }
        case 'sprite': {
            const sprites = spriteCache[spriteFolderName]?.map(x => x.files).flat();
            const results = performFuzzySearch('persona-expression-sprites', sprites, [{ name: 'title', weight: 1 }, { name: 'fileName', weight: 1 }], searchTerm);
            const matchedSprite = results[0]?.item;
            if (!matchedSprite) {
                toastr.warning(t`No sprite file found for search term ${searchTerm}`, t`Set Sprite`);
                return '';
            }
            label = matchedSprite.expression;
            spriteFile = matchedSprite.fileName;
            break;
        }
    }

    await sendExpressionCall(spriteFolderName, label, { force: true, overrideSpriteFile: spriteFile });
    return label;
}

(async function () {
    function addPersonaExpressionImage() {
        const html = `
        <div id="persona_expression-wrapper">
            <div id="persona_expression-holder" class="persona_expression-holder" style="display:none;">
                <div id="persona_expression-holderheader" class="fa-solid fa-grip drag-grabber"></div>
                <img id="persona_expression-image" class="persona_expression">
            </div>
        </div>`;
        $('body').append(html);
        loadMovingUIState();
    }

    async function addSettings() {
        try {
            const response = await fetch(`${EXTENSION_FOLDER}/settings.html`);
            if (!response.ok) {
                throw new Error(`Failed to load settings: ${response.status}`);
            }
            const settingsHtml = await response.text();
            $('#extensions_settings2').append(settingsHtml);
        } catch (error) {
            console.error('[Persona Expressions] Failed to load settings:', error);
            return;
        }

        const settings = getSettings();

        $('#persona_expression_enabled').prop('checked', settings.enabled).on('input', function () {
            const s = getSettings();
            s.enabled = !!$(this).prop('checked');
            saveSettingsDebounced();
        });

        $('#persona_expression_messages_count').val(settings.messagesToAnalyze ?? DEFAULT_MESSAGES_TO_ANALYZE).on('input', function () {
            const s = getSettings();
            s.messagesToAnalyze = parseInt($(this).val()) || DEFAULT_MESSAGES_TO_ANALYZE;
            saveSettingsDebounced();
        });

        $('#persona_expression_api').val(settings.api ?? EXPRESSION_API.local).on('change', function () {
            const s = getSettings();
            s.api = Number($(this).val());
            expressionsList = null;
            spriteCache = {};
            moduleWorker();
            saveSettingsDebounced();
        });

        $('#persona_expressions_allow_multiple').prop('checked', settings.allowMultiple ?? true).on('input', function () {
            const s = getSettings();
            s.allowMultiple = !!$(this).prop('checked');
            saveSettingsDebounced();
        });

        $('#persona_expressions_reroll_if_same').prop('checked', settings.rerollIfSame ?? true).on('input', function () {
            const s = getSettings();
            s.rerollIfSame = !!$(this).prop('checked');
            saveSettingsDebounced();
        });

        $('#persona_expression_position').val(settings.position ?? 'bottom-right').on('change', function () {
            const s = getSettings();
            s.position = $(this).val();
            applyUISettings();
            saveSettingsDebounced();
        });

        $('#persona_expression_size').val(settings.size ?? 200).on('input', function () {
            const s = getSettings();
            s.size = parseInt($(this).val()) || 200;
            $('#persona_expression_size_value').text(s.size);
            applyUISettings();
            saveSettingsDebounced();
        });

        $('#persona_expression_opacity').val(settings.opacity ?? 100).on('input', function () {
            const s = getSettings();
            s.opacity = parseInt($(this).val()) || 100;
            $('#persona_expression_opacity_value').text(s.opacity);
            applyUISettings();
            saveSettingsDebounced();
        });

        $('#persona_expression_upload_pack_button').on('click', onClickPersonaExpressionUploadPackButton);

        $(document).on('click', '.persona_expression_list_item', onClickExpressionImage);
        $(document).on('click', '.persona_expression_list_upload', onClickPersonaExpressionUpload);
        $(document).on('click', '.persona_expression_list_delete', onClickPersonaExpressionDelete);

        await renderAdditionalExpressionSettings();
        $('#persona_expression_api').val(settings.api ?? EXPRESSION_API.local);

        const avatarId = getCurrentAvatarId();
        const spriteFolderName = getPersonaSpriteFolderName();

        if (spriteFolderName) {
            await validateImages(spriteFolderName, true);
        } else {
            $('#persona_open_chat_expressions').hide();
            $('#persona_no_chat_expressions').show();
        }

        $('#persona_expression_custom_add').on('click', async function () {
            const name = prompt('Enter custom expression name (letters, numbers, dashes, underscores only):');
            if (!name) return;
            name = name.trim().toLowerCase();
            if (!/^[a-z0-9-_]+$/.test(name)) {
                toastr.warning('Invalid expression name');
                return;
            }
            if (DEFAULT_EXPRESSIONS.includes(name)) {
                toastr.warning('Expression name already exists');
                return;
            }
            const s = getSettings();
            if (!s.custom) s.custom = [];
            if (s.custom.includes(name)) {
                toastr.warning('Custom expression already exists');
                return;
            }
            s.custom.push(name);
            await renderAdditionalExpressionSettings();
            saveSettingsDebounced();
            expressionsList = null;
            spriteCache = {};
            moduleWorker();
        });

        $('#persona_expression_custom_remove').on('click', async function () {
            const selectedExpression = String($('#persona_expression_custom').val());
            if (!selectedExpression) return;
            const confirmed = confirm(`Remove custom expression "${selectedExpression}"?`);
            if (!confirmed) return;
            const s = getSettings();
            const index = s.custom.indexOf(selectedExpression);
            if (index > -1) s.custom.splice(index, 1);
            await renderAdditionalExpressionSettings();
            saveSettingsDebounced();
            expressionsList = null;
            spriteCache = {};
            moduleWorker();
        });

        $('#persona_expression_fallback').on('change', function () {
            const s = getSettings();
            const selectedValue = $(this).val();
            if (selectedValue === OPTION_NO_FALLBACK) {
                s.fallback_expression = null;
                s.showDefault = false;
            } else if (selectedValue === OPTION_EMOJI_FALLBACK) {
                s.fallback_expression = null;
                s.showDefault = true;
            } else {
                s.fallback_expression = selectedValue;
                s.showDefault = false;
            }
            saveSettingsDebounced();
        });
    }

    addPersonaExpressionImage();
    migrateSettings();
    await addSettings();
    applyUISettings();

    const wrapper = new ModuleWorkerWrapper(moduleWorker);
    setInterval(() => wrapper.update(), UPDATE_INTERVAL);
    moduleWorker();

    dragElement($('#persona_expression-holder'));

    eventSource.on(event_types.CHAT_CHANGED, () => {
        removeExpression();
        spriteCache = {};
        lastExpression = {};
        const imgElement = document.getElementById('persona_expression-image');
        if (imgElement && imgElement instanceof HTMLImageElement) {
            imgElement.src = '';
        }
        wrapper.update({ newChat: true });
    });

    eventSource.on(event_types.PERSONA_CHANGED, (personaName) => {
        onPersonaChanged(personaName);
    });

    const localEnumProviders = {
        expressions: () => {
            const settings = getSettings();
            const currentPersona = getCurrentPersonaName();
            const spriteFolderName = getPersonaSpriteFolderName();
            const expressions = getCachedExpressions();
            return expressions.map(expression => {
                const spriteCount = spriteCache[spriteFolderName]?.find(x => x.label === expression)?.files.length ?? 0;
                const isCustom = settings.custom?.includes(expression);
                const subtitle = spriteCount == 0 ? 'No sprites available' : spriteCount > 1 ? `${spriteCount} sprites` : null;
                return new SlashCommandEnumValue(expression, subtitle, isCustom ? enumTypes.name : enumTypes.enum, isCustom ? 'C' : 'D');
            });
        },
        sprites: () => {
            const settings = getSettings();
            const currentPersona = getCurrentPersonaName();
            const spriteFolderName = getPersonaSpriteFolderName();
            const sprites = spriteCache[spriteFolderName]?.map(x => x.files)?.flat() ?? [];
            return sprites.map(x => new SlashCommandEnumValue(x.title, x.title !== x.expression ? x.expression : null, x.isCustom ? enumTypes.name : enumTypes.enum, x.isCustom ? 'C' : 'D'));
        },
    };

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'persona-expression',
        aliases: ['pe', 'persona-emote', 'persona-sprite'],
        callback: setSpriteSlashCommand,
        namedArgumentList: [
            SlashCommandNamedArgument.fromProps({
                name: 'type',
                description: 'Whether to set an expression or a specific sprite.',
                typeList: [ARGUMENT_TYPE.STRING],
                isRequired: false,
                defaultValue: 'expression',
                enumList: ['expression', 'sprite'],
            }),
        ],
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'expression label to set',
                typeList: [ARGUMENT_TYPE.STRING],
                isRequired: true,
                enumProvider: (executor) => {
                    const type = executor.namedArgumentList.find(it => it.name == 'type')?.value || 'expression';
                    if (type == 'sprite') return localEnumProviders.sprites();
                    return [...localEnumProviders.expressions(), new SlashCommandEnumValue(RESET_SPRITE_LABEL, 'Resets the expression', enumTypes.enum, 'X')];
                },
            }),
        ],
        helpString: 'Force sets the expression for the current persona.',
        returns: 'The currently set expression label.',
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'persona-list',
        aliases: ['persona-expressions'],
        callback: async (args) => {
            const returnType = args.return;
            const list = await getExpressionsList();
            return await slashCommandReturnHelper.doReturn(returnType ?? 'pipe', list, { objectToStringFunc: list => list.join(', ') });
        },
        namedArgumentList: [
            SlashCommandNamedArgument.fromProps({
                name: 'return',
                description: 'The way how you want the return value to be provided',
                typeList: [ARGUMENT_TYPE.STRING],
                defaultValue: 'pipe',
                enumList: slashCommandReturnHelper.enumList({ allowObject: true }),
                forceEnum: true,
            }),
        ],
        returns: 'The comma-separated list of available expressions.',
        helpString: 'Returns a list of available expressions.',
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'persona-classify',
        aliases: ['persona-classify'],
        callback: async (_, text) => {
            if (!text) {
                toastr.error('No text provided');
                return '';
            }
            const label = await getExpressionLabel(text);
            console.debug(`Classification result for "${text}": ${label}`);
            return label;
        },
        unnamedArgumentList: [
            new SlashCommandArgument('text to classify', [ARGUMENT_TYPE.STRING], true),
        ],
        returns: 'emotion classification label for the given text',
        helpString: 'Classifies the emotion of the given text and returns a label.',
    }));

    console.log('[Persona Expressions] Extension loaded');
})();
