-- ============================================
-- MURMURE B2B LICENSING - RATE LIMITING
-- ============================================
-- Run this script AFTER 002_licensing_functions.sql

-- ============================================
-- RATE LIMIT TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    identifier_type TEXT NOT NULL CHECK (identifier_type IN ('device_id', 'ip_address', 'api_key')),
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, identifier_type, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- ============================================
-- RATE LIMIT CONFIGURATION
-- ============================================

CREATE TABLE IF NOT EXISTS rate_limit_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT UNIQUE NOT NULL,
    max_requests INTEGER NOT NULL DEFAULT 100,
    window_seconds INTEGER NOT NULL DEFAULT 60,
    block_duration_seconds INTEGER NOT NULL DEFAULT 300,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default rate limits
INSERT INTO rate_limit_config (endpoint, max_requests, window_seconds, block_duration_seconds) VALUES
    ('check_subscription', 60, 60, 300),      -- 60 req/min, block 5 min
    ('register_device', 10, 3600, 3600),      -- 10 req/hour, block 1 hour
    ('heartbeat', 120, 60, 60)                -- 120 req/min, block 1 min
ON CONFLICT (endpoint) DO NOTHING;

-- ============================================
-- BLOCKED IPS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS blocked_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL,
    reason TEXT,
    blocked_until TIMESTAMPTZ,
    permanent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_ips ON blocked_ips(ip_address);

-- ============================================
-- RATE LIMITING FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION check_rate_limit(
    p_identifier TEXT,
    p_identifier_type TEXT,
    p_endpoint TEXT,
    p_ip_address INET DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_config RECORD;
    v_current RECORD;
    v_blocked RECORD;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- Check if IP is blocked
    IF p_ip_address IS NOT NULL THEN
        SELECT * INTO v_blocked FROM blocked_ips 
        WHERE ip_address = p_ip_address 
        AND (permanent = TRUE OR blocked_until > v_now);
        
        IF FOUND THEN
            RETURN json_build_object(
                'allowed', false,
                'reason', 'IP blocked',
                'blocked_until', v_blocked.blocked_until
            );
        END IF;
    END IF;

    -- Get rate limit config
    SELECT * INTO v_config FROM rate_limit_config 
    WHERE endpoint = p_endpoint AND enabled = TRUE;
    
    IF NOT FOUND THEN
        -- No rate limit configured, allow
        RETURN json_build_object('allowed', true);
    END IF;
    
    -- Get current request count in window
    SELECT * INTO v_current FROM rate_limits
    WHERE identifier = p_identifier 
    AND identifier_type = p_identifier_type
    AND endpoint = p_endpoint
    AND window_start > v_now - (v_config.window_seconds || ' seconds')::INTERVAL;
    
    IF NOT FOUND THEN
        -- First request in this window
        INSERT INTO rate_limits (identifier, identifier_type, endpoint, request_count, window_start)
        VALUES (p_identifier, p_identifier_type, p_endpoint, 1, v_now);
        
        RETURN json_build_object(
            'allowed', true,
            'remaining', v_config.max_requests - 1,
            'reset_at', v_now + (v_config.window_seconds || ' seconds')::INTERVAL
        );
    END IF;
    
    -- Check if over limit
    IF v_current.request_count >= v_config.max_requests THEN
        -- Block the identifier
        IF p_ip_address IS NOT NULL THEN
            INSERT INTO blocked_ips (ip_address, reason, blocked_until)
            VALUES (p_ip_address, 'Rate limit exceeded on ' || p_endpoint, 
                    v_now + (v_config.block_duration_seconds || ' seconds')::INTERVAL)
            ON CONFLICT DO NOTHING;
        END IF;
        
        RETURN json_build_object(
            'allowed', false,
            'reason', 'Rate limit exceeded',
            'retry_after', v_config.block_duration_seconds,
            'blocked_until', v_now + (v_config.block_duration_seconds || ' seconds')::INTERVAL
        );
    END IF;
    
    -- Increment counter
    UPDATE rate_limits 
    SET request_count = request_count + 1
    WHERE id = v_current.id;
    
    RETURN json_build_object(
        'allowed', true,
        'remaining', v_config.max_requests - v_current.request_count - 1,
        'reset_at', v_current.window_start + (v_config.window_seconds || ' seconds')::INTERVAL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATE check_subscription WITH RATE LIMITING
-- ============================================

CREATE OR REPLACE FUNCTION check_subscription_with_rate_limit(
    p_device_id TEXT,
    p_ip_address INET DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_rate_check JSON;
    v_result JSON;
BEGIN
    -- Check rate limit first
    v_rate_check := check_rate_limit(p_device_id, 'device_id', 'check_subscription', p_ip_address);
    
    IF NOT (v_rate_check->>'allowed')::BOOLEAN THEN
        RETURN json_build_object(
            'data', json_build_object(
                'status', 'blocked',
                'message', 'Too many requests. Please try again later.',
                'retry_after', v_rate_check->>'retry_after'
            ),
            'rate_limited', true
        );
    END IF;
    
    -- Call original function
    v_result := check_subscription(p_device_id);
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CLEANUP OLD RATE LIMIT ENTRIES (scheduled job)
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
    -- Delete rate limit entries older than 1 hour
    DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
    
    -- Delete expired IP blocks
    DELETE FROM blocked_ips WHERE permanent = FALSE AND blocked_until < NOW();
    
    -- Delete old audit logs (keep 30 days)
    DELETE FROM license_audit_log WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ADMIN: Manage rate limits
-- ============================================

CREATE OR REPLACE FUNCTION admin_update_rate_limit(
    p_endpoint TEXT,
    p_max_requests INTEGER,
    p_window_seconds INTEGER,
    p_block_duration_seconds INTEGER
)
RETURNS JSON AS $$
BEGIN
    UPDATE rate_limit_config 
    SET max_requests = p_max_requests,
        window_seconds = p_window_seconds,
        block_duration_seconds = p_block_duration_seconds
    WHERE endpoint = p_endpoint;
    
    IF NOT FOUND THEN
        INSERT INTO rate_limit_config (endpoint, max_requests, window_seconds, block_duration_seconds)
        VALUES (p_endpoint, p_max_requests, p_window_seconds, p_block_duration_seconds);
    END IF;
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_block_ip(p_ip_address INET, p_reason TEXT, p_permanent BOOLEAN DEFAULT FALSE)
RETURNS JSON AS $$
BEGIN
    INSERT INTO blocked_ips (ip_address, reason, permanent, blocked_until)
    VALUES (p_ip_address, p_reason, p_permanent, 
            CASE WHEN p_permanent THEN NULL ELSE NOW() + INTERVAL '24 hours' END);
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_unblock_ip(p_ip_address INET)
RETURNS JSON AS $$
BEGIN
    DELETE FROM blocked_ips WHERE ip_address = p_ip_address;
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION check_subscription_with_rate_limit(TEXT, INET) TO anon;
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, TEXT, TEXT, INET) TO anon;
