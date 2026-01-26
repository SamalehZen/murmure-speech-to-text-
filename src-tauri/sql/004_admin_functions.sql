-- ============================================
-- MURMURE B2B LICENSING - ADMIN DASHBOARD FUNCTIONS
-- ============================================
-- Run this script AFTER 003_rate_limiting.sql

-- ============================================
-- LIST FUNCTIONS FOR ADMIN DASHBOARD
-- ============================================

CREATE OR REPLACE FUNCTION admin_list_devices()
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_agg(row_to_json(d))
        FROM (
            SELECT id, device_id, device_name, user_id, company_id, 
                   platform, app_version, registered_at, last_heartbeat,
                   is_blocked, blocked_reason
            FROM devices
            ORDER BY last_heartbeat DESC
            LIMIT 1000
        ) d
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_list_companies()
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_agg(row_to_json(c))
        FROM (
            SELECT id, name, email, subscription_status, subscription_expires_at,
                   max_devices, max_users, is_blocked, blocked_reason, created_at
            FROM companies
            ORDER BY created_at DESC
            LIMIT 500
        ) c
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_list_users()
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_agg(row_to_json(u))
        FROM (
            SELECT id, email, name, company_id, subscription_status,
                   is_blocked, blocked_reason, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 500
        ) u
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- EXTENDED STATS
-- ============================================

CREATE OR REPLACE FUNCTION admin_get_stats()
RETURNS JSON AS $$
DECLARE
    v_total_devices INTEGER;
    v_active_devices INTEGER;
    v_blocked_devices INTEGER;
    v_total_companies INTEGER;
    v_total_users INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_devices FROM devices;
    SELECT COUNT(*) INTO v_active_devices FROM devices 
        WHERE last_heartbeat > NOW() - INTERVAL '7 days' AND NOT is_blocked;
    SELECT COUNT(*) INTO v_blocked_devices FROM devices WHERE is_blocked;
    SELECT COUNT(*) INTO v_total_companies FROM companies;
    SELECT COUNT(*) INTO v_total_users FROM users;
    
    RETURN json_build_object(
        'total_devices', v_total_devices,
        'active_devices', v_active_devices,
        'blocked_devices', v_blocked_devices,
        'total_companies', v_total_companies,
        'total_users', v_total_users
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- BLOCK/UNBLOCK FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION admin_block_company(p_company_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSON AS $$
BEGIN
    UPDATE companies 
    SET is_blocked = true, blocked_reason = p_reason, subscription_status = 'blocked'
    WHERE id = p_company_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Company not found');
    END IF;
    
    UPDATE devices SET is_blocked = true, blocked_reason = 'Company blocked'
    WHERE company_id = p_company_id;
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_unblock_company(p_company_id UUID)
RETURNS JSON AS $$
BEGIN
    UPDATE companies 
    SET is_blocked = false, blocked_reason = NULL, subscription_status = 'active'
    WHERE id = p_company_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Company not found');
    END IF;
    
    UPDATE devices SET is_blocked = false, blocked_reason = NULL
    WHERE company_id = p_company_id AND blocked_reason = 'Company blocked';
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_block_user(p_user_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSON AS $$
BEGIN
    UPDATE users 
    SET is_blocked = true, blocked_reason = p_reason, subscription_status = 'blocked'
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;
    
    UPDATE devices SET is_blocked = true, blocked_reason = 'User blocked'
    WHERE user_id = p_user_id;
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_unblock_user(p_user_id UUID)
RETURNS JSON AS $$
BEGIN
    UPDATE users 
    SET is_blocked = false, blocked_reason = NULL, subscription_status = 'active'
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;
    
    UPDATE devices SET is_blocked = false, blocked_reason = NULL
    WHERE user_id = p_user_id AND blocked_reason = 'User blocked';
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- AUDIT LOG QUERY
-- ============================================

CREATE OR REPLACE FUNCTION admin_get_audit_log(p_device_id TEXT DEFAULT NULL, p_limit INTEGER DEFAULT 100)
RETURNS JSON AS $$
BEGIN
    IF p_device_id IS NOT NULL THEN
        RETURN (
            SELECT json_agg(row_to_json(l))
            FROM (
                SELECT id, device_id, action, status, ip_address::TEXT, details, created_at
                FROM license_audit_log
                WHERE device_id = p_device_id
                ORDER BY created_at DESC
                LIMIT p_limit
            ) l
        );
    ELSE
        RETURN (
            SELECT json_agg(row_to_json(l))
            FROM (
                SELECT id, device_id, action, status, ip_address::TEXT, details, created_at
                FROM license_audit_log
                ORDER BY created_at DESC
                LIMIT p_limit
            ) l
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS (use service_role for admin)
-- ============================================

-- Note: These functions should only be called with service_role key
-- from a secure admin backend, not from the client app
