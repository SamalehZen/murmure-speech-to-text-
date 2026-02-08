import { useTranslation } from '@/i18n';
import { useTones, DEFAULT_BASE_PROMPT } from './hooks/use-tones';
import { useLLMConnect } from '@/features/llm-connect/hooks/use-llm-connect';
import { TonesSettings } from './tones-settings';

export function TonesPage() {
    const { t } = useTranslation();
    const {
        settings: tonesSettings,
        isLoading: isTonesLoading,
        addTone,
        updateTone,
        deleteTone,
        addRegisteredApp,
        updateRegisteredApp,
        deleteRegisteredApp,
        setDefaultTone,
        updateBasePrompt,
    } = useTones();

    const { models, isLoading: isModelsLoading } = useLLMConnect();

    if (isTonesLoading || isModelsLoading) {
        return (
            <div className="p-8 text-center text-zinc-500">
                {t('Loading...')}
            </div>
        );
    }

    return (
        <main>
            <TonesSettings
                tones={tonesSettings.tones}
                registeredApps={tonesSettings.registered_apps}
                defaultToneId={tonesSettings.default_tone_id}
                models={models}
                basePrompt={tonesSettings.base_prompt}
                defaultBasePrompt={DEFAULT_BASE_PROMPT}
                onAddTone={addTone}
                onUpdateTone={updateTone}
                onDeleteTone={deleteTone}
                onAddRegisteredApp={addRegisteredApp}
                onUpdateRegisteredApp={updateRegisteredApp}
                onDeleteRegisteredApp={deleteRegisteredApp}
                onSetDefaultTone={setDefaultTone}
                onUpdateBasePrompt={updateBasePrompt}
            />
        </main>
    );
}
