export type CommandActionType =
    | 'insert_newline'
    | 'insert_paragraph'
    | 'start_list'
    | 'end_list'
    | 'list_item'
    | 'start_bold'
    | 'end_bold'
    | 'start_italic'
    | 'end_italic'
    | 'insert_signature'
    | 'undo'
    | 'clear_all'
    | 'insert_date'
    | 'insert_time';

export type CommandAction = CommandActionType | { insert_text: string };

export interface VoiceCommand {
    id: string;
    triggers: string[];
    action: CommandAction;
    enabled: boolean;
    category: string;
}

export interface SignatureConfig {
    text: string;
    per_app_signatures: Record<string, string>;
}

export interface VoiceCommandSettings {
    enabled: boolean;
    commands: VoiceCommand[];
    signature: SignatureConfig;
    list_bullet: string;
    markdown_mode: boolean;
}
