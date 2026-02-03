export type SetupStep = 'welcome' | 'mode-choice' | 'cloud-config' | 'offline-download' | 'complete';

export interface InitialSetupState {
    completed: boolean;
    selected_mode: 'cloud' | 'offline' | null;
}
