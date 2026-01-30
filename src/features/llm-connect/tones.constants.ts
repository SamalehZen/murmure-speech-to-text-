import { ToneConfig } from './llm-connect.types';

export const DEFAULT_TONES: ToneConfig[] = [
    {
        id: 'professional',
        name: 'Professionnel',
        description: 'Emails et communications d\'entreprise',
        icon: '📧',
        prompt_modifier: `Reformule de manière professionnelle et formelle:
- Ajoute une salutation appropriée (Bonjour/Madame/Monsieur)
- Utilise le vouvoiement
- Structure en paragraphes clairs
- Ajoute une formule de politesse (Cordialement, Bien à vous)
- Corrige grammaire et orthographe`,
        apps: ['Microsoft Outlook', 'Gmail', 'Microsoft Word', 'Mozilla Thunderbird'],
    },
    {
        id: 'semiformal',
        name: 'Semi-formel',
        description: 'Communications de travail décontractées',
        icon: '💬',
        prompt_modifier: `Reformule de manière semi-formelle:
- Garde un ton professionnel mais accessible
- Tutoiement ou vouvoiement selon le contexte
- Corrige les erreurs sans être trop rigide
- Style concis et direct`,
        apps: ['Slack', 'Microsoft Teams', 'Discord'],
    },
    {
        id: 'casual',
        name: 'Casual',
        description: 'Messages entre amis et famille',
        icon: '😎',
        prompt_modifier: `Reformule de manière décontractée:
- Ton amical et naturel
- Tutoiement
- Utilise des emojis occasionnellement si approprié
- Garde les abréviations courantes
- Corrige juste les erreurs évidentes`,
        apps: ['WhatsApp', 'Messenger', 'Telegram', 'Signal'],
    },
    {
        id: 'technical',
        name: 'Technique',
        description: 'Code et documentation',
        icon: '💻',
        prompt_modifier: `Format technique pour IDE/code:
- Si c'est une demande de code, génère le code approprié
- Si c'est un commentaire, formate-le correctement (// ou /* */)
- Préserve les termes techniques en anglais
- Respecte la casse: camelCase, PascalCase, snake_case
- Pas de markdown ni backticks`,
        apps: ['Visual Studio Code', 'IntelliJ IDEA', 'PyCharm', 'WebStorm', 'Sublime Text', 'Notepad++'],
    },
    {
        id: 'notes',
        name: 'Notes',
        description: 'Prise de notes et documentation',
        icon: '📝',
        prompt_modifier: `Format pour prise de notes:
- Structure avec bullet points si approprié
- Identifie les points clés
- Style concis et organisé
- Peut utiliser du markdown basique`,
        apps: ['Notion', 'Obsidian', 'Evernote', 'Microsoft OneNote'],
    },
    {
        id: 'creative',
        name: 'Créatif',
        description: 'Écriture créative et storytelling',
        icon: '✨',
        prompt_modifier: `Style créatif et expressif:
- Enrichis le vocabulaire
- Garde le ton personnel de l'auteur
- Améliore la fluidité sans changer le sens
- Ponctuation expressive autorisée`,
        apps: [],
    },
];
