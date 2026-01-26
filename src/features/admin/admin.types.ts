export interface Device {
    id: string;
    device_id: string;
    device_name: string | null;
    user_id: string | null;
    company_id: string | null;
    platform: 'windows' | 'linux' | 'macos' | 'unknown';
    app_version: string;
    registered_at: string;
    last_heartbeat: string;
    is_blocked: boolean;
    blocked_reason: string | null;
}

export interface User {
    id: string;
    email: string | null;
    name: string | null;
    company_id: string | null;
    subscription_status: 'active' | 'suspended' | 'expired' | 'blocked';
    is_blocked: boolean;
    blocked_reason: string | null;
    created_at: string;
}

export interface Company {
    id: string;
    name: string;
    email: string | null;
    subscription_status: 'active' | 'suspended' | 'expired' | 'blocked';
    subscription_expires_at: string | null;
    max_devices: number;
    max_users: number;
    is_blocked: boolean;
    blocked_reason: string | null;
    created_at: string;
}

export interface AuditLogEntry {
    id: string;
    device_id: string;
    action: 'check' | 'register' | 'heartbeat' | 'block' | 'unblock' | 'activate' | 'deactivate';
    status: string;
    ip_address: string | null;
    details: Record<string, unknown>;
    created_at: string;
}

export interface LicenseStats {
    total_devices: number;
    active_devices: number;
    blocked_devices: number;
    total_companies: number;
    total_users: number;
}

export interface RateLimitConfig {
    endpoint: string;
    max_requests: number;
    window_seconds: number;
    block_duration_seconds: number;
    enabled: boolean;
}

export interface BlockedIP {
    id: string;
    ip_address: string;
    reason: string | null;
    blocked_until: string | null;
    permanent: boolean;
    created_at: string;
}
