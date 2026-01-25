export type LLMProvider = 'ollama' | 'openai' | 'anthropic' | 'google' | 'openrouter';

export interface ProviderConfig {
    provider: LLMProvider;
    api_key?: string;
    base_url: string;
    model: string;
    available_models: string[];
}

export interface ActiveWindowInfo {
    app_name: string;
    window_title: string;
    process_name: string;
}

export type AppMatchType = 'app_name_contains' | 'window_title_contains' | 'process_name_equals' | 'window_title_regex';

export interface AppPromptRule {
    id: string;
    name: string;
    match_type: AppMatchType;
    match_pattern: string;
    prompt_template: string;
    priority: number;
    enabled: boolean;
}

export const PROVIDER_LABELS: Record<LLMProvider, string> = {
    ollama: 'Ollama (Local)',
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google Gemini',
    openrouter: 'OpenRouter',
};

export const PROVIDER_BASE_URLS: Record<LLMProvider, string> = {
    ollama: 'http://localhost:11434/api',
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    google: 'https://generativelanguage.googleapis.com/v1beta',
    openrouter: 'https://openrouter.ai/api/v1',
};

export const DEFAULT_APP_RULES: AppPromptRule[] = [
    {
        id: 'email-gmail',
        name: 'Gmail / Email',
        match_type: 'window_title_contains',
        match_pattern: 'gmail',
        prompt_template: `<role>Tu es un assistant de rédaction d'emails professionnels.</role>

<instructions>
Reformule la transcription suivante en email professionnel:
- Ajoute une salutation appropriée
- Structure le contenu en paragraphes clairs
- Ajoute une formule de politesse
- Corrige la grammaire et l'orthographe
</instructions>

<input>{{TRANSCRIPT}}</input>`,
        priority: 100,
        enabled: true,
    },
    {
        id: 'code-vscode',
        name: 'VS Code / IDE',
        match_type: 'app_name_contains',
        match_pattern: 'code',
        prompt_template: `<role>Tu es un assistant de développement.</role>

<instructions>
Convertis cette instruction vocale en code ou commentaire technique:
- Si c'est une demande de code, génère le code approprié
- Si c'est un commentaire, formate-le correctement
- Préserve les termes techniques en anglais
</instructions>

<input>{{TRANSCRIPT}}</input>`,
        priority: 90,
        enabled: true,
    },
    {
        id: 'chat-gpt',
        name: 'ChatGPT / AI Chat',
        match_type: 'window_title_contains',
        match_pattern: 'chatgpt',
        prompt_template: `<role>Tu es un assistant de prompt engineering.</role>

<instructions>
Reformule cette transcription en prompt clair et structuré:
- Clarifie l'intention
- Ajoute du contexte si nécessaire
- Structure avec des instructions claires
</instructions>

<input>{{TRANSCRIPT}}</input>`,
        priority: 85,
        enabled: true,
    },
    {
        id: 'notes-app',
        name: 'Notes / Notion',
        match_type: 'window_title_regex',
        match_pattern: '(notion|notes|obsidian|evernote)',
        prompt_template: `<role>Tu es un assistant de prise de notes.</role>

<instructions>
Formate cette transcription en note structurée:
- Utilise des bullet points si approprié
- Identifie les points clés
- Garde un style concis
</instructions>

<input>{{TRANSCRIPT}}</input>`,
        priority: 80,
        enabled: true,
    },
    {
        id: 'messaging',
        name: 'WhatsApp / Slack / Discord',
        match_type: 'window_title_regex',
        match_pattern: '(whatsapp|slack|discord|telegram|messenger)',
        prompt_template: `<role>Tu es un assistant de messagerie.</role>

<instructions>
Reformule en message conversationnel approprié:
- Ton décontracté mais clair
- Corrige les erreurs sans changer le sens
- Garde le message concis
</instructions>

<input>{{TRANSCRIPT}}</input>`,
        priority: 75,
        enabled: true,
    },
];
