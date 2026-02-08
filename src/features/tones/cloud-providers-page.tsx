import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from '@/i18n';
import { toast } from 'react-toastify';
import { Eye, EyeOff, CheckCircle, XCircle, Loader2, Cloud } from 'lucide-react';
import { Input } from '@/components/input';
import {
    CloudProvidersSettings,
    LLMProviderType,
    ProviderSettings,
} from './hooks/use-tones';

interface ProviderConfig {
    key: keyof CloudProvidersSettings;
    name: string;
    description: string;
    defaultModel: string;
    docsUrl: string;
}

const PROVIDERS: ProviderConfig[] = [
    {
        key: 'gemini',
        name: 'Google Gemini',
        description: 'Fast and efficient models from Google',
        defaultModel: 'gemini-2.0-flash',
        docsUrl: 'https://aistudio.google.com/app/apikey',
    },
    {
        key: 'openai',
        name: 'OpenAI',
        description: 'GPT-4o and other OpenAI models',
        defaultModel: 'gpt-4o-mini',
        docsUrl: 'https://platform.openai.com/api-keys',
    },
    {
        key: 'groq',
        name: 'Groq',
        description: 'Ultra-fast inference with Llama and other models',
        defaultModel: 'llama-3.1-8b-instant',
        docsUrl: 'https://console.groq.com/keys',
    },
    {
        key: 'openrouter',
        name: 'OpenRouter',
        description: 'Access to many models through a single API',
        defaultModel: '',
        docsUrl: 'https://openrouter.ai/keys',
    },
];

const DEFAULT_SETTINGS: CloudProvidersSettings = {
    gemini: { api_key: '', default_model: 'gemini-2.0-flash' },
    openai: { api_key: '', default_model: 'gpt-4o-mini' },
    openrouter: { api_key: '', default_model: '' },
    groq: { api_key: '', default_model: 'llama-3.1-8b-instant' },
};

export function CloudProvidersPage() {
    const { t } = useTranslation();
    const [settings, setSettings] = useState<CloudProvidersSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const [testingProvider, setTestingProvider] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<Record<string, boolean | null>>({});
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const loaded = await invoke<CloudProvidersSettings>('get_cloud_providers_settings');
            setSettings(loaded);
        } catch (error) {
            console.error('Failed to load cloud providers settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveSettings = async (newSettings: CloudProvidersSettings) => {
        try {
            await invoke('set_cloud_providers_settings', { settings: newSettings });
            setSettings(newSettings);
            toast.success(t('Settings saved'));
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error(t('Failed to save settings'));
        }
    };

    const updateProvider = (provider: keyof CloudProvidersSettings, updates: Partial<ProviderSettings>) => {
        const newSettings = {
            ...settings,
            [provider]: { ...settings[provider], ...updates },
        };
        saveSettings(newSettings);
    };

    const testConnection = async (provider: keyof CloudProvidersSettings) => {
        const apiKey = settings[provider]?.api_key;
        if (!apiKey) {
            toast.error(t('Please enter an API key first'));
            return;
        }

        setTestingProvider(provider);
        setTestResults((prev) => ({ ...prev, [provider]: null }));

        try {
            const result = await invoke<boolean>('test_cloud_provider_connection', {
                provider: provider as LLMProviderType,
                apiKey,
            });
            setTestResults((prev) => ({ ...prev, [provider]: result }));
            if (result) {
                toast.success(t('Connection successful'));
            }
        } catch (error) {
            setTestResults((prev) => ({ ...prev, [provider]: false }));
            toast.error(t('Connection failed: ') + String(error));
        } finally {
            setTestingProvider(null);
        }
    };

    const toggleShowKey = (provider: string) => {
        setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
    };

    if (isLoading) {
        return (
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-xl font-semibold text-zinc-100">{t('Cloud LLM Providers')}</h1>
                </div>
                <div className="p-8 text-center text-zinc-500">
                    {t('Loading...')}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-xl font-semibold text-zinc-100">{t('Cloud LLM Providers')}</h1>
                <p className="text-sm text-zinc-500 mt-1">
                    {t('Configure API keys for cloud LLM providers. These can be used as alternatives to local Ollama models.')}
                </p>
            </div>

            <div className="space-y-6">
                {PROVIDERS.map((provider) => {
                    const providerSettings = settings[provider.key] || { api_key: '', default_model: '' };
                    const hasKey = Boolean(providerSettings.api_key);
                    const testResult = testResults[provider.key];
                    const isTesting = testingProvider === provider.key;

                    return (
                        <div
                            key={provider.key}
                            className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg space-y-4"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-zinc-700 rounded-lg">
                                        <Cloud className="w-5 h-5 text-sky-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-zinc-100">{provider.name}</h3>
                                        <p className="text-sm text-zinc-500">{provider.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {hasKey && testResult === true && (
                                        <span className="flex items-center gap-1 text-green-400 text-sm">
                                            <CheckCircle className="w-4 h-4" />
                                            {t('Connected')}
                                        </span>
                                    )}
                                    {hasKey && testResult === false && (
                                        <span className="flex items-center gap-1 text-red-400 text-sm">
                                            <XCircle className="w-4 h-4" />
                                            {t('Failed')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-1">
                                        {t('API Key')}
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                type={showKeys[provider.key] ? 'text' : 'password'}
                                                placeholder={t('Enter your API key')}
                                                value={providerSettings.api_key}
                                                onChange={(e) =>
                                                    updateProvider(provider.key, { api_key: e.target.value })
                                                }
                                                className="pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => toggleShowKey(provider.key)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                                            >
                                                {showKeys[provider.key] ? (
                                                    <EyeOff className="w-4 h-4" />
                                                ) : (
                                                    <Eye className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => testConnection(provider.key)}
                                            disabled={!hasKey || isTesting}
                                            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 rounded text-sm text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isTesting ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                t('Test')
                                            )}
                                        </button>
                                    </div>
                                    <a
                                        href={provider.docsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-sky-400 hover:text-sky-300 mt-1 inline-block"
                                    >
                                        {t('Get API key')} →
                                    </a>
                                </div>
                            </div>
                        </div>
                    );
                })}

                <div className="p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-lg">
                    <h4 className="text-sm font-medium text-zinc-300 mb-2">{t('How it works')}</h4>
                    <ul className="text-sm text-zinc-500 space-y-1 list-disc list-inside">
                        <li>{t('Configure API keys here for the cloud providers you want to use')}</li>
                        <li>{t('When editing a tone, you can choose between Ollama (local) or a cloud provider')}</li>
                        <li>{t('Cloud providers require an internet connection but are faster to set up')}</li>
                        <li>{t('Your API keys are stored locally and never sent to our servers')}</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
