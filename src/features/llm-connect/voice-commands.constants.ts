import { VoiceCommand, VoiceCommandSettings } from './voice-commands.types';

export const COMMAND_CATEGORIES = {
    punctuation: { label: 'Ponctuation', icon: '✏️' },
    navigation: { label: 'Navigation / Structure', icon: '📐' },
    lists: { label: 'Listes', icon: '📋' },
    formatting: { label: 'Formatage', icon: '🎨' },
    special: { label: 'Insertions spéciales', icon: '✨' },
    control: { label: 'Contrôle', icon: '⚙️' },
} as const;

export type CommandCategory = keyof typeof COMMAND_CATEGORIES;

export const DEFAULT_VOICE_COMMANDS: VoiceCommand[] = [
    {
        id: 'cmd-period',
        triggers: ['point', 'period'],
        action: { insert_text: '.' },
        enabled: true,
        category: 'punctuation',
    },
    {
        id: 'cmd-comma',
        triggers: ['virgule', 'comma'],
        action: { insert_text: ',' },
        enabled: true,
        category: 'punctuation',
    },
    {
        id: 'cmd-exclamation',
        triggers: ["point d'exclamation", 'exclamation mark'],
        action: { insert_text: '!' },
        enabled: true,
        category: 'punctuation',
    },
    {
        id: 'cmd-question',
        triggers: ["point d'interrogation", 'question mark'],
        action: { insert_text: '?' },
        enabled: true,
        category: 'punctuation',
    },
    {
        id: 'cmd-colon',
        triggers: ['deux points', 'colon'],
        action: { insert_text: ':' },
        enabled: true,
        category: 'punctuation',
    },
    {
        id: 'cmd-semicolon',
        triggers: ['point virgule', 'semicolon'],
        action: { insert_text: ';' },
        enabled: true,
        category: 'punctuation',
    },
    {
        id: 'cmd-open-paren',
        triggers: ['ouvrir parenthèse', 'open parenthesis'],
        action: { insert_text: '(' },
        enabled: true,
        category: 'punctuation',
    },
    {
        id: 'cmd-close-paren',
        triggers: ['fermer parenthèse', 'close parenthesis'],
        action: { insert_text: ')' },
        enabled: true,
        category: 'punctuation',
    },
    {
        id: 'cmd-open-quote',
        triggers: ['ouvrir guillemets', 'open quote'],
        action: { insert_text: '« ' },
        enabled: true,
        category: 'punctuation',
    },
    {
        id: 'cmd-close-quote',
        triggers: ['fermer guillemets', 'close quote'],
        action: { insert_text: ' »' },
        enabled: true,
        category: 'punctuation',
    },
    {
        id: 'cmd-ellipsis',
        triggers: ['points de suspension', 'ellipsis'],
        action: { insert_text: '...' },
        enabled: true,
        category: 'punctuation',
    },
    {
        id: 'cmd-dash',
        triggers: ['tiret', 'dash'],
        action: { insert_text: ' - ' },
        enabled: true,
        category: 'punctuation',
    },
    {
        id: 'cmd-newline',
        triggers: ['nouvelle ligne', 'new line', 'à la ligne'],
        action: 'insert_newline',
        enabled: true,
        category: 'navigation',
    },
    {
        id: 'cmd-paragraph',
        triggers: ['nouveau paragraphe', 'new paragraph'],
        action: 'insert_paragraph',
        enabled: true,
        category: 'navigation',
    },
    {
        id: 'cmd-tab',
        triggers: ['tabulation', 'tab'],
        action: { insert_text: '\t' },
        enabled: true,
        category: 'navigation',
    },
    {
        id: 'cmd-start-list',
        triggers: ['liste à puces', 'bullet list', 'commencer liste'],
        action: 'start_list',
        enabled: true,
        category: 'lists',
    },
    {
        id: 'cmd-end-list',
        triggers: ['fin de liste', 'end list', 'terminer liste'],
        action: 'end_list',
        enabled: true,
        category: 'lists',
    },
    {
        id: 'cmd-list-item',
        triggers: ['élément suivant', 'next item', 'puce suivante'],
        action: 'list_item',
        enabled: true,
        category: 'lists',
    },
    {
        id: 'cmd-first-item',
        triggers: ['premier élément', 'first item', 'premièrement'],
        action: { insert_text: '\n• ' },
        enabled: true,
        category: 'lists',
    },
    {
        id: 'cmd-start-bold',
        triggers: ['en gras', 'bold', 'début gras'],
        action: 'start_bold',
        enabled: true,
        category: 'formatting',
    },
    {
        id: 'cmd-end-bold',
        triggers: ['fin gras', 'end bold'],
        action: 'end_bold',
        enabled: true,
        category: 'formatting',
    },
    {
        id: 'cmd-start-italic',
        triggers: ['en italique', 'italic', 'début italique'],
        action: 'start_italic',
        enabled: true,
        category: 'formatting',
    },
    {
        id: 'cmd-end-italic',
        triggers: ['fin italique', 'end italic'],
        action: 'end_italic',
        enabled: true,
        category: 'formatting',
    },
    {
        id: 'cmd-signature',
        triggers: ['signature', 'insérer signature'],
        action: 'insert_signature',
        enabled: true,
        category: 'special',
    },
    {
        id: 'cmd-date',
        triggers: ['date du jour', "today's date", 'insérer date'],
        action: 'insert_date',
        enabled: true,
        category: 'special',
    },
    {
        id: 'cmd-time',
        triggers: ['heure actuelle', 'current time', 'insérer heure'],
        action: 'insert_time',
        enabled: true,
        category: 'special',
    },
    {
        id: 'cmd-undo',
        triggers: ['annuler', 'undo', 'effacer ça'],
        action: 'undo',
        enabled: true,
        category: 'control',
    },
    {
        id: 'cmd-clear',
        triggers: ['tout effacer', 'clear all', 'recommencer'],
        action: 'clear_all',
        enabled: true,
        category: 'control',
    },
];

export const DEFAULT_VOICE_COMMAND_SETTINGS: VoiceCommandSettings = {
    enabled: false,
    commands: DEFAULT_VOICE_COMMANDS,
    signature: {
        text: '',
        per_app_signatures: {},
    },
    list_bullet: '•',
    markdown_mode: false,
};

export const LIST_BULLET_OPTIONS = [
    { value: '•', label: '• (puce)' },
    { value: '-', label: '- (tiret)' },
    { value: '*', label: '* (astérisque)' },
];

export function getActionPreview(action: VoiceCommand['action']): string {
    if (typeof action === 'string') {
        const previews: Record<string, string> = {
            insert_newline: '↵',
            insert_paragraph: '↵↵',
            start_list: '• ...',
            end_list: '↵',
            list_item: '• ',
            start_bold: '**',
            end_bold: '**',
            start_italic: '*',
            end_italic: '*',
            insert_signature: '[signature]',
            insert_date: 'dd/mm/yyyy',
            insert_time: 'HH:MM',
            undo: '↶',
            clear_all: '🗑️',
        };
        return previews[action] ?? action;
    }
    if ('insert_text' in action) {
        const text = action.insert_text;
        if (text === '\t') return '→|';
        if (text === '\n• ') return '↵• ';
        return text;
    }
    return '?';
}
