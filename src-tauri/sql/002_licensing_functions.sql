-- ============================================
-- MURMURE B2B LICENSING SYSTEM - RPC FUNCTIONS
-- ============================================
-- Run this script AFTER 001_licensing_schema.sql

-- ============================================
-- HELPER: Generate signature for response
-- ============================================

CREATE OR REPLACE FUNCTION generate_response_signature(payload JSONB, secret TEXT)
RETURNS TEXT AS $$
DECLARE
    signature TEXT;
BEGIN
    signature := encode(
        hmac(
            payload::TEXT || extract(epoch from now())::TEXT,
            secret,
            'sha256'
        ),
        'hex'
    );
    RETURN signature;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- MAIN: Check Subscription Status
-- ============================================

CREATE OR REPLACE FUNCTION check_subscription(p_device_id TEXT)
RETURNS JSON AS $$
DECLARE
    v_device RECORD;
    v_user RECORD;
    v_company RECORD;
    v_response JSON;
    v_timestamp BIGINT;
    v_secret TEXT;
BEGIN
    v_timestamp := extract(epoch from now())::BIGINT;
    v_secret := current_setting('app.settings.license_secret', true);
    IF v_secret IS NULL THEN
        v_secret := 'default-secret-change-in-production';
    END IF;

    -- Find device
    SELECT * INTO v_device FROM devices WHERE device_id = p_device_id;
    
    -- Device not found - auto-register as new
    IF NOT FOUND THEN
        INSERT INTO devices (device_id, platform, app_version)
        VALUES (p_device_id, 'unknown', 'unknown')
        RETURNING * INTO v_device;
        
        INSERT INTO license_audit_log (device_id, action, status, details)
        VALUES (p_device_id, 'register', 'success', '{"auto_registered": true}'::JSONB);
        
        v_response := json_build_object(
            'status', 'active',
            'message', 'Device registered successfully',
            'timestamp', v_timestamp
        );
        RETURN json_build_object(
            'data', v_response,
            'signature', encode(hmac(v_response::TEXT, v_secret, 'sha256'), 'hex')
        );
    END IF;
    
    -- Check if device is blocked
    IF v_device.is_blocked THEN
        INSERT INTO license_audit_log (device_id, action, status, details)
        VALUES (p_device_id, 'check', 'blocked', json_build_object('reason', v_device.blocked_reason)::JSONB);
        
        v_response := json_build_object(
            'status', 'blocked',
            'message', COALESCE(v_device.blocked_reason, 'Device blocked by administrator'),
            'timestamp', v_timestamp
        );
        RETURN json_build_object(
            'data', v_response,
            'signature', encode(hmac(v_response::TEXT, v_secret, 'sha256'), 'hex')
        );
    END IF;
    
    -- Check user status if linked
    IF v_device.user_id IS NOT NULL THEN
        SELECT * INTO v_user FROM users WHERE id = v_device.user_id;
        IF FOUND AND (v_user.is_blocked OR v_user.subscription_status NOT IN ('active')) THEN
            INSERT INTO license_audit_log (device_id, action, status, details)
            VALUES (p_device_id, 'check', 'suspended', json_build_object('reason', 'user_blocked', 'user_id', v_user.id)::JSONB);
            
            v_response := json_build_object(
                'status', 'suspended',
                'message', COALESCE(v_user.blocked_reason, 'User account suspended'),
                'timestamp', v_timestamp
            );
            RETURN json_build_object(
                'data', v_response,
                'signature', encode(hmac(v_response::TEXT, v_secret, 'sha256'), 'hex')
            );
        END IF;
    END IF;
    
    -- Check company status if linked
    IF v_device.company_id IS NOT NULL THEN
        SELECT * INTO v_company FROM companies WHERE id = v_device.company_id;
        IF FOUND THEN
            -- Check if company is blocked
            IF v_company.is_blocked OR v_company.subscription_status NOT IN ('active') THEN
                INSERT INTO license_audit_log (device_id, action, status, details)
                VALUES (p_device_id, 'check', 'blocked', json_build_object('reason', 'company_blocked', 'company_id', v_company.id)::JSONB);
                
                v_response := json_build_object(
                    'status', 'blocked',
                    'message', COALESCE(v_company.blocked_reason, 'Company subscription inactive'),
                    'timestamp', v_timestamp
                );
                RETURN json_build_object(
                    'data', v_response,
                    'signature', encode(hmac(v_response::TEXT, v_secret, 'sha256'), 'hex')
                );
            END IF;
            
            -- Check if subscription expired
            IF v_company.subscription_expires_at IS NOT NULL AND v_company.subscription_expires_at < NOW() THEN
                INSERT INTO license_audit_log (device_id, action, status, details)
                VALUES (p_device_id, 'check', 'expired', json_build_object('reason', 'subscription_expired', 'expired_at', v_company.subscription_expires_at)::JSONB);
                
                v_response := json_build_object(
                    'status', 'expired',
                    'message', 'Company subscription has expired',
                    'expires_at', v_company.subscription_expires_at,
                    'timestamp', v_timestamp
                );
                RETURN json_build_object(
                    'data', v_response,
                    'signature', encode(hmac(v_response::TEXT, v_secret, 'sha256'), 'hex')
                );
            END IF;
        END IF;
    END IF;
    
    -- All checks passed - update heartbeat
    UPDATE devices 
    SET last_heartbeat = NOW(), last_check = NOW() 
    WHERE device_id = p_device_id;
    
    INSERT INTO license_audit_log (device_id, action, status, details)
    VALUES (p_device_id, 'check', 'active', '{}'::JSONB);
    
    v_response := json_build_object(
        'status', 'active',
        'timestamp', v_timestamp
    );
    RETURN json_build_object(
        'data', v_response,
        'signature', encode(hmac(v_response::TEXT, v_secret, 'sha256'), 'hex')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Register Device (with full info)
-- ============================================

CREATE OR REPLACE FUNCTION register_device(
    p_device_id TEXT,
    p_platform TEXT DEFAULT 'unknown',
    p_app_version TEXT DEFAULT 'unknown',
    p_user_id UUID DEFAULT NULL,
    p_company_id UUID DEFAULT NULL,
    p_hostname TEXT DEFAULT NULL,
    p_os_version TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_device RECORD;
    v_company RECORD;
    v_device_count INTEGER;
BEGIN
    -- Check if company has device limit
    IF p_company_id IS NOT NULL THEN
        SELECT * INTO v_company FROM companies WHERE id = p_company_id;
        IF FOUND THEN
            SELECT COUNT(*) INTO v_device_count FROM devices WHERE company_id = p_company_id;
            IF v_device_count >= v_company.max_devices THEN
                RETURN json_build_object(
                    'success', false,
                    'error', 'Company device limit reached'
                );
            END IF;
        END IF;
    END IF;

    -- Insert or update device
    INSERT INTO devices (
        device_id, platform, app_version, user_id, company_id, hostname, os_version
    ) VALUES (
        p_device_id, p_platform, p_app_version, p_user_id, p_company_id, p_hostname, p_os_version
    )
    ON CONFLICT (device_id) DO UPDATE SET
        platform = EXCLUDED.platform,
        app_version = EXCLUDED.app_version,
        user_id = COALESCE(EXCLUDED.user_id, devices.user_id),
        company_id = COALESCE(EXCLUDED.company_id, devices.company_id),
        hostname = COALESCE(EXCLUDED.hostname, devices.hostname),
        os_version = COALESCE(EXCLUDED.os_version, devices.os_version),
        last_heartbeat = NOW()
    RETURNING * INTO v_device;
    
    INSERT INTO license_audit_log (device_id, action, status, details)
    VALUES (p_device_id, 'register', 'success', json_build_object(
        'platform', p_platform,
        'app_version', p_app_version
    )::JSONB);
    
    RETURN json_build_object(
        'success', true,
        'device_id', v_device.device_id,
        'registered_at', v_device.registered_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Heartbeat
-- ============================================

CREATE OR REPLACE FUNCTION heartbeat(p_device_id TEXT)
RETURNS JSON AS $$
BEGIN
    UPDATE devices 
    SET last_heartbeat = NOW() 
    WHERE device_id = p_device_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Device not found');
    END IF;
    
    INSERT INTO license_audit_log (device_id, action, status)
    VALUES (p_device_id, 'heartbeat', 'success');
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ADMIN FUNCTIONS
-- ============================================

-- Block a device
CREATE OR REPLACE FUNCTION admin_block_device(p_device_id TEXT, p_reason TEXT DEFAULT NULL)
RETURNS JSON AS $$
BEGIN
    UPDATE devices 
    SET is_blocked = true, blocked_reason = p_reason, blocked_at = NOW()
    WHERE device_id = p_device_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Device not found');
    END IF;
    
    INSERT INTO license_audit_log (device_id, action, status, details)
    VALUES (p_device_id, 'block', 'success', json_build_object('reason', p_reason)::JSONB);
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Unblock a device
CREATE OR REPLACE FUNCTION admin_unblock_device(p_device_id TEXT)
RETURNS JSON AS $$
BEGIN
    UPDATE devices 
    SET is_blocked = false, blocked_reason = NULL, blocked_at = NULL
    WHERE device_id = p_device_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Device not found');
    END IF;
    
    INSERT INTO license_audit_log (device_id, action, status)
    VALUES (p_device_id, 'unblock', 'success');
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Block all devices for a company
CREATE OR REPLACE FUNCTION admin_block_company_devices(p_company_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE devices 
    SET is_blocked = true, blocked_reason = p_reason, blocked_at = NOW()
    WHERE company_id = p_company_id;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN json_build_object('success', true, 'devices_blocked', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get device statistics
CREATE OR REPLACE FUNCTION admin_get_stats()
RETURNS JSON AS $$
DECLARE
    v_total_devices INTEGER;
    v_active_devices INTEGER;
    v_blocked_devices INTEGER;
    v_total_companies INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_devices FROM devices;
    SELECT COUNT(*) INTO v_active_devices FROM devices 
        WHERE last_heartbeat > NOW() - INTERVAL '7 days' AND NOT is_blocked;
    SELECT COUNT(*) INTO v_blocked_devices FROM devices WHERE is_blocked;
    SELECT COUNT(*) INTO v_total_companies FROM companies;
    
    RETURN json_build_object(
        'total_devices', v_total_devices,
        'active_devices', v_active_devices,
        'blocked_devices', v_blocked_devices,
        'total_companies', v_total_companies
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT EXECUTE TO ANON
-- ============================================

GRANT EXECUTE ON FUNCTION check_subscription(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION register_device(TEXT, TEXT, TEXT, UUID, UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION heartbeat(TEXT) TO anon;
