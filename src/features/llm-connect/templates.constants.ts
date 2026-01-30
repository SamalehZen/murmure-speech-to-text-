import { TextTemplate } from './llm-connect.types';

export const TEMPLATE_CATEGORIES = {
    email: { label: 'Email', icon: '📧' },
    code: { label: 'Code', icon: '💻' },
    notes: { label: 'Notes', icon: '📝' },
    social: { label: 'Social', icon: '👥' },
} as const;

export type TemplateCategory = keyof typeof TEMPLATE_CATEGORIES;

export const DEFAULT_TEMPLATES: TextTemplate[] = [
    {
        id: 'email-suivi-projet',
        name: 'Suivi de projet',
        triggerWords: ['template suivi projet', 'suivi projet', 'template projet'],
        category: 'email',
        language: 'fr',
        appPatterns: ['Microsoft Outlook', 'Gmail', 'Mozilla Thunderbird'],
        content: `Objet : [PROJET] - Point de suivi semaine [XX]

Bonjour,

Voici le point de suivi pour cette semaine :

📊 Avancement :
- [Point 1]
- [Point 2]

⚠️ Points d'attention :
- [Risque/Blocage]

📅 Prochaines étapes :
- [Action 1] - [Date]
- [Action 2] - [Date]

N'hésitez pas si vous avez des questions.

Cordialement,
[Signature]`,
    },
    {
        id: 'email-relance',
        name: 'Email de relance',
        triggerWords: ['template relance', 'relance', 'template rappel'],
        category: 'email',
        language: 'fr',
        appPatterns: ['Microsoft Outlook', 'Gmail'],
        content: `Objet : Relance - [Sujet]

Bonjour,

Je me permets de revenir vers vous concernant [sujet].

Suite à notre dernier échange du [date], je souhaitais savoir si vous aviez pu avancer sur ce point.

Je reste à votre disposition pour en discuter.

Cordialement,
[Signature]`,
    },
    {
        id: 'email-conge',
        name: 'Demande de congé',
        triggerWords: ['template congé', 'demande congé', 'template vacances'],
        category: 'email',
        language: 'fr',
        appPatterns: ['Microsoft Outlook', 'Gmail'],
        content: `Objet : Demande de congés du [date début] au [date fin]

Bonjour,

Je souhaiterais poser des congés du [date début] au [date fin] inclus, soit [X] jours ouvrés.

Mes dossiers en cours seront traités/transmis à [collègue] pendant mon absence.

Merci de bien vouloir valider cette demande.

Cordialement,
[Signature]`,
    },
    {
        id: 'code-bug-report',
        name: 'Bug Report',
        triggerWords: ['template bug', 'bug report', 'rapport bug'],
        category: 'code',
        language: 'fr',
        appPatterns: ['Discord', 'Slack', 'Jira'],
        content: `🐛 **Bug Report**

**Description :**
[Description du bug]

**Étapes pour reproduire :**
1. [Étape 1]
2. [Étape 2]
3. [Étape 3]

**Comportement attendu :**
[Ce qui devrait se passer]

**Comportement actuel :**
[Ce qui se passe réellement]

**Environnement :**
- OS: [Windows/macOS/Linux]
- Version: [X.X.X]
- Navigateur: [si applicable]

**Logs/Screenshots :**
[Joindre si disponible]`,
    },
    {
        id: 'code-pr-description',
        name: 'PR Description',
        triggerWords: ['template pr', 'pull request', 'template merge request'],
        category: 'code',
        language: 'en',
        appPatterns: ['Visual Studio Code', 'GitHub'],
        content: `## Description
[Brief description of changes]

## Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- [Change 1]
- [Change 2]

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated`,
    },
    {
        id: 'code-commit',
        name: 'Commit Message',
        triggerWords: ['template commit', 'message commit'],
        category: 'code',
        language: 'en',
        appPatterns: ['Visual Studio Code', 'IntelliJ IDEA'],
        content: `[type]([scope]): [short description]

[longer description if needed]

[BREAKING CHANGE: description if applicable]
[Closes #issue_number]`,
    },
    {
        id: 'msg-meeting-recap',
        name: 'Récap Meeting',
        triggerWords: ['template meeting', 'recap meeting', 'compte rendu'],
        category: 'notes',
        language: 'fr',
        appPatterns: ['Slack', 'Microsoft Teams', 'Notion'],
        content: `📋 **Compte-rendu - [Sujet]**
📅 Date : [Date]
👥 Participants : [Noms]

**Points abordés :**
1. [Point 1]
2. [Point 2]

**Décisions prises :**
- [Décision 1]
- [Décision 2]

**Actions à suivre :**
| Action | Responsable | Deadline |
|--------|-------------|----------|
| [Action] | [Nom] | [Date] |

**Prochaine réunion :** [Date si applicable]`,
    },
    {
        id: 'msg-standup',
        name: 'Daily Standup',
        triggerWords: ['template standup', 'daily', 'template daily'],
        category: 'notes',
        language: 'fr',
        appPatterns: ['Slack', 'Microsoft Teams', 'Discord'],
        content: `🌅 **Daily Standup**

**Hier :**
- [Tâche complétée 1]
- [Tâche complétée 2]

**Aujourd'hui :**
- [Tâche prévue 1]
- [Tâche prévue 2]

**Blocages :**
- [Aucun / Description du blocage]`,
    },
    {
        id: 'linkedin-connexion',
        name: 'Demande de connexion',
        triggerWords: ['template linkedin', 'connexion linkedin'],
        category: 'social',
        language: 'fr',
        appPatterns: ['linkedin.com'],
        content: `Bonjour [Prénom],

J'ai découvert votre profil via [contexte] et votre parcours dans [domaine] a retenu mon attention.

Je travaille actuellement sur [sujet] et je pense que nous pourrions avoir des synergies intéressantes.

Seriez-vous ouvert(e) à un échange de 15 minutes ?

Au plaisir d'échanger,
[Votre nom]`,
    },
];
