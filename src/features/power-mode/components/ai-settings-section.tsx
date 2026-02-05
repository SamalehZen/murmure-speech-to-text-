import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/select';
import { Switch } from '@/components/switch';
import { HighlightedPromptEditor } from '@/features/llm-connect/components/highlighted-prompt-editor';
import {
    LLMProvider,
    PROVIDER_LABELS,
    ProviderConfig,
} from '@/features/llm-connect/llm-connect.types';
import { useTranslation } from '@/i18n';

const PROVIDERS: LLMProvider[] = [
    'ollama',
    'openai',
    'anthropic',
    'google',
    'openrouter',
];

interface AISettingsSectionProps {
    isEnabled: boolean;
    onEnabledChange: (enabled: boolean) => void;
    provider: LLMProvider | null;
    onProviderChange: (provider: LLMProvider) => void;
    model: string | null;
    onModelChange: (model: string) => void;
    promptTemplate: string;
    onPromptChange: (prompt: string) => void;
    useScreenCapture: boolean;
    onScreenCaptureChange: (enabled: boolean) => void;
}

export const AISettingsSection = ({
    isEnabled,
    onEnabledChange,
    provider,
    onProviderChange,
    model,
    onModelChange,
    promptTemplate,
    onPromptChange,
    useScreenCapture,
    onScreenCaptureChange,
}: AISettingsSectionProps) => {
    const { t } = useTranslation();
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [providers, setProviders] = useState<Record<string, ProviderConfig>>(
        {}
    );
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    useEffect(() => {
        const loadProviders = async () => {
            try {
                const settings = await invoke<{
                    providers: Record<string, ProviderConfig>;
                }>('get_llm_connect_settings');
                setProviders(settings.providers);
            } catch (err) {
                console.error('Failed to load providers:', err);
            }
        };
        loadProviders();
    }, []);

    useEffect(() => {
        if (provider === null || !isEnabled) {
            setAvailableModels([]);
            return;
        }

        const providerConfig = providers[provider];
        if (providerConfig?.available_models?.length > 0) {
            setAvailableModels(providerConfig.available_models);
        } else {
            loadModelsForProvider(provider);
        }
    }, [provider, providers, isEnabled]);

    const loadModelsForProvider = async (p: LLMProvider) => {
        if (p === 'ollama') {
            try {
                setIsLoadingModels(true);
                const models = await invoke<{ name: string }[]>(
                    'fetch_ollama_models',
                    { url: providers[p]?.base_url || 'http://localhost:11434/api' }
                );
                setAvailableModels(models.map((m) => m.name));
            } catch {
                setAvailableModels([]);
            } finally {
                setIsLoadingModels(false);
            }
        } else {
            const config = providers[p];
            if (config?.api_key) {
                try {
                    setIsLoadingModels(true);
                    const models = await invoke<string[]>('fetch_provider_models', {
                        provider: p,
                        apiKey: config.api_key,
                        baseUrl: config.base_url,
                    });
                    setAvailableModels(models);
                } catch {
                    setAvailableModels([]);
                } finally {
                    setIsLoadingModels(false);
                }
            }
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-medium text-zinc-200">
                        {t('AI Enhancement')}
                    </h3>
                    <p className="text-sm text-zinc-500">
                        {t('Process transcriptions with AI before pasting')}
                    </p>
                </div>
                <Switch checked={isEnabled} onCheckedChange={onEnabledChange} />
            </div>

            {isEnabled && (
                <div className="space-y-4 pl-4 border-l-2 border-zinc-700">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">
                            {t('Provider')}
                        </label>
                        <Select
                            value={provider || ''}
                            onValueChange={(value) =>
                                onProviderChange(value as LLMProvider)
                            }
                        >
                            <SelectTrigger className="w-full bg-zinc-800 border-zinc-700">
                                <SelectValue placeholder={t('Select provider')} />
                            </SelectTrigger>
                            <SelectContent>
                                {PROVIDERS.map((p) => (
                                    <SelectItem key={p} value={p}>
                                        {PROVIDER_LABELS[p]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {provider !== null && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">
                                {t('Model')}
                            </label>
                            <Select
                                value={model || ''}
                                onValueChange={onModelChange}
                            >
                                <SelectTrigger className="w-full bg-zinc-800 border-zinc-700">
                                    <SelectValue
                                        placeholder={
                                            isLoadingModels
                                                ? t('Loading models...')
                                                : t('Select model')
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableModels.map((m) => (
                                        <SelectItem key={m} value={m}>
                                            {m}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">
                            {t('Prompt Template')}
                        </label>
                        <HighlightedPromptEditor
                            value={promptTemplate}
                            onChange={onPromptChange}
                            className="h-48"
                            placeholder={t('Enter your prompt template...')}
                        />
                        <p className="text-xs text-zinc-500">
                            {t('Use {{TRANSCRIPT}} for the transcription text')}
                        </p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <div>
                            <h4 className="text-sm font-medium text-zinc-300">
                                {t('Context Awareness')}
                            </h4>
                            <p className="text-xs text-zinc-500">
                                {t('Include screen capture for context')}
                            </p>
                        </div>
                        <Switch
                            checked={useScreenCapture}
                            onCheckedChange={onScreenCaptureChange}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
