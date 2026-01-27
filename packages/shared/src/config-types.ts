export interface GlobalConfig {
    shortcuts: ShortcutConfig[]
    llmSettings: LLMSettings
    dictionary: DictionaryEntry[]
    formattingRules: FormattingRule[]
    appPrompts: AppPrompt[]
    updatedAt: Date
}

export interface ShortcutConfig {
    id: string
    action: ShortcutAction
    keys: string[]
    enabled: boolean
}

export type ShortcutAction =
    | "start_stop_record"
    | "quick_transcribe"
    | "toggle_overlay"
    | "switch_llm_mode"
    | "copy_last_result"

export const SHORTCUT_ACTION_LABELS: Record<ShortcutAction, string> = {
    start_stop_record: "Start/Stop Record",
    quick_transcribe: "Quick Transcribe",
    toggle_overlay: "Toggle Overlay",
    switch_llm_mode: "Switch LLM Mode",
    copy_last_result: "Copy Last Result",
}

export type LLMProvider = "openai" | "anthropic" | "google"

export const LLM_PROVIDER_LABELS: Record<LLMProvider, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
}

export interface LLMSettings {
    defaultProvider: LLMProvider
    fallbackOrder: LLMProvider[]
    providers: {
        openai?: ProviderConfig
        anthropic?: ProviderConfig
        google?: ProviderConfig
    }
}

export interface ProviderConfig {
    enabled: boolean
    model: string
    temperature: number
    maxTokens: number
}

export const DEFAULT_PROVIDER_MODELS: Record<LLMProvider, string[]> = {
    openai: ["gpt-4-turbo", "gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
    anthropic: [
        "claude-3-opus-20240229",
        "claude-3-sonnet-20240229",
        "claude-3-haiku-20240307",
    ],
    google: ["gemini-pro", "gemini-pro-vision", "gemini-1.5-pro"],
}

export interface DictionaryEntry {
    id: string
    spoken: string
    written: string
    category: string
    caseSensitive: boolean
}

export const DICTIONARY_CATEGORIES = [
    "Brand",
    "Tech",
    "Code",
    "Medical",
    "Legal",
    "General",
] as const

export type DictionaryCategory = (typeof DICTIONARY_CATEGORIES)[number]

export type FormattingRuleType =
    | "capitalize"
    | "punctuation"
    | "number_conversion"
    | "contraction"
    | "filler_removal"
    | "custom"

export const FORMATTING_RULE_TYPE_LABELS: Record<FormattingRuleType, string> = {
    capitalize: "Capitalize",
    punctuation: "Punctuation",
    number_conversion: "Number Conversion",
    contraction: "Contraction",
    filler_removal: "Filler Removal",
    custom: "Custom",
}

export interface FormattingRule {
    id: string
    name: string
    type: FormattingRuleType
    enabled: boolean
    order: number
    config?: Record<string, unknown>
}

export interface AppPrompt {
    id: string
    appName: string
    processNames: string[]
    windowTitleContains?: string
    systemPrompt: string
    enabled: boolean
}

export interface ConfigVersion {
    id: string
    configType:
        | "shortcuts"
        | "llm"
        | "dictionary"
        | "prompts"
        | "formatting"
    previousValue: unknown
    newValue: unknown
    changedBy: string
    changedAt: Date
    note?: string
}

export interface DictionaryPreset {
    name: string
    description: string
    words: Omit<DictionaryEntry, "id">[]
    category: string
}

export const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
    {
        id: "1",
        action: "start_stop_record",
        keys: ["Ctrl", "Space"],
        enabled: true,
    },
    {
        id: "2",
        action: "quick_transcribe",
        keys: ["Alt", "T"],
        enabled: true,
    },
    {
        id: "3",
        action: "toggle_overlay",
        keys: ["Ctrl", "Shift", "O"],
        enabled: true,
    },
    {
        id: "4",
        action: "switch_llm_mode",
        keys: ["Ctrl", "M"],
        enabled: true,
    },
    {
        id: "5",
        action: "copy_last_result",
        keys: ["Ctrl", "Shift", "C"],
        enabled: true,
    },
]

export const DEFAULT_LLM_SETTINGS: LLMSettings = {
    defaultProvider: "openai",
    fallbackOrder: ["openai", "anthropic", "google"],
    providers: {
        openai: {
            enabled: true,
            model: "gpt-4-turbo",
            temperature: 0.7,
            maxTokens: 2000,
        },
        anthropic: {
            enabled: false,
            model: "claude-3-sonnet-20240229",
            temperature: 0.7,
            maxTokens: 2000,
        },
        google: {
            enabled: false,
            model: "gemini-pro",
            temperature: 0.7,
            maxTokens: 2000,
        },
    },
}

export const DEFAULT_FORMATTING_RULES: FormattingRule[] = [
    {
        id: "1",
        name: "Capitalize first letter",
        type: "capitalize",
        enabled: true,
        order: 1,
    },
    {
        id: "2",
        name: "Add period at end",
        type: "punctuation",
        enabled: true,
        order: 2,
    },
    {
        id: "3",
        name: "Convert numbers (>10)",
        type: "number_conversion",
        enabled: true,
        order: 3,
    },
    {
        id: "4",
        name: "Fix common contractions",
        type: "contraction",
        enabled: true,
        order: 4,
    },
    {
        id: "5",
        name: "Remove filler words",
        type: "filler_removal",
        enabled: true,
        order: 5,
    },
]

export const DEFAULT_APP_PROMPTS: AppPrompt[] = [
    {
        id: "1",
        appName: "Cursor",
        processNames: ["cursor.exe", "Cursor.app"],
        windowTitleContains: "Cursor",
        systemPrompt: `You are a coding assistant. The user is dictating code or instructions for Cursor IDE.

<instructions>
- Format output as code when appropriate
- Use proper indentation
- Fix obvious typos
</instructions>

User's transcription: {{transcription}}`,
        enabled: true,
    },
    {
        id: "2",
        appName: "ChatGPT",
        processNames: ["chrome.exe", "firefox.exe", "safari"],
        windowTitleContains: "ChatGPT",
        systemPrompt: `Reformulate the following transcription for a chat conversation with an AI assistant.

User's transcription: {{transcription}}`,
        enabled: true,
    },
    {
        id: "3",
        appName: "Default",
        processNames: [],
        systemPrompt: `Clean up and format the following speech transcription. Fix any grammatical errors and improve readability.

User's transcription: {{transcription}}`,
        enabled: true,
    },
]

export const TECH_DICTIONARY_PRESET: DictionaryPreset = {
    name: "Tech Preset",
    description: "Common technology terms and brand names",
    category: "Tech",
    words: [
        { spoken: "chat gpt", written: "ChatGPT", category: "Tech", caseSensitive: true },
        { spoken: "open ai", written: "OpenAI", category: "Tech", caseSensitive: true },
        { spoken: "javascript", written: "JavaScript", category: "Code", caseSensitive: true },
        { spoken: "typescript", written: "TypeScript", category: "Code", caseSensitive: true },
        { spoken: "react js", written: "React", category: "Code", caseSensitive: true },
        { spoken: "next js", written: "Next.js", category: "Code", caseSensitive: true },
        { spoken: "node js", written: "Node.js", category: "Code", caseSensitive: true },
        { spoken: "vs code", written: "VS Code", category: "Tech", caseSensitive: true },
        { spoken: "github", written: "GitHub", category: "Tech", caseSensitive: true },
        { spoken: "api", written: "API", category: "Tech", caseSensitive: true },
        { spoken: "html", written: "HTML", category: "Code", caseSensitive: true },
        { spoken: "css", written: "CSS", category: "Code", caseSensitive: true },
        { spoken: "json", written: "JSON", category: "Code", caseSensitive: true },
        { spoken: "sql", written: "SQL", category: "Code", caseSensitive: true },
    ],
}

export const MEDICAL_DICTIONARY_PRESET: DictionaryPreset = {
    name: "Medical Preset",
    description: "Common medical terms and abbreviations",
    category: "Medical",
    words: [
        { spoken: "dr", written: "Dr.", category: "Medical", caseSensitive: false },
        { spoken: "mg", written: "mg", category: "Medical", caseSensitive: false },
        { spoken: "ml", written: "ml", category: "Medical", caseSensitive: false },
        { spoken: "bp", written: "BP", category: "Medical", caseSensitive: true },
        { spoken: "ecg", written: "ECG", category: "Medical", caseSensitive: true },
        { spoken: "ekg", written: "EKG", category: "Medical", caseSensitive: true },
        { spoken: "mri", written: "MRI", category: "Medical", caseSensitive: true },
        { spoken: "ct scan", written: "CT scan", category: "Medical", caseSensitive: true },
        { spoken: "iv", written: "IV", category: "Medical", caseSensitive: true },
        { spoken: "prn", written: "PRN", category: "Medical", caseSensitive: true },
    ],
}

export const DICTIONARY_PRESETS = [TECH_DICTIONARY_PRESET, MEDICAL_DICTIONARY_PRESET]
