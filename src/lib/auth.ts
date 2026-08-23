import { supabase } from './supabase';
import { Role, Staff } from '../types';

const SESSION_KEY = 'pd_session';

export interface AppSession {
  token: string;
  email: string;
  name: string;
  role: Role;
  staffObj: Staff | null;
}

/**
 * Reads the stored session. Anything unparseable or missing a token is treated
 * as logged out rather than thrown, so a corrupt value can never lock the user
 * out of the app permanently.
 */
export function loadSession(): AppSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed.token !== 'string' ||
      typeof parsed.email !== 'string' ||
      typeof parsed.role !== 'string'
    ) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed as AppSession;
  } catch (e) {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (_) {}
    return null;
  }
}

export function saveSession(session: AppSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('Could not persist session:', e);
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {}
}

export function getSessionToken(): string | null {
  return loadSession()?.token ?? null;
}

/**
 * Verifies credentials inside the database. The password is sent once over
 * TLS and compared against a bcrypt hash server-side; no password or hash is
 * ever returned to the browser.
 */
export async function signIn(
  email: string,
  password: string
): Promise<{ ok: boolean; session?: AppSession; error?: string }> {
  const { data, error } = await supabase.rpc('authenticate_user', {
    p_email: email,
    p_password: password,
  });

  if (error) {
    console.warn('Sign-in RPC error:', error.message);
    return { ok: false, error: 'Could not reach the login service. Check your connection and try again.' };
  }

  if (!data || data.ok !== true) {
    return { ok: false, error: (data && data.error) || 'Invalid email or password.' };
  }

  const staffObj: Staff | null =
    data.role === 'staff'
      ? {
          id: data.staffId,
          name: data.name,
          email: data.email,
          phone: '',
          role: 'staff',
          assignedPropertyIds: Array.isArray(data.assignedPropertyIds) ? data.assignedPropertyIds : [],
        }
      : null;

  const session: AppSession = {
    token: data.token,
    email: data.email,
    name: data.name,
    role: data.role as Role,
    staffObj,
  };

  saveSession(session);
  return { ok: true, session };
}

export async function signOut() {
  const token = getSessionToken();
  clearSession();
  if (!token) return;
  try {
    await supabase.rpc('logout_session', { p_token: token });
  } catch (e) {
    // The local session is already gone; a failed server-side revoke should
    // not block the user from logging out.
    console.warn('Session revoke failed:', e);
  }
}

// ---------------------------------------------------------------------------
// Villa memos. The table is not directly readable with the anon key — these
// functions check the caller's role and property assignments server-side.
// ---------------------------------------------------------------------------

export async function fetchVillaMemos() {
  const token = getSessionToken();
  if (!token) return { data: null, error: 'Not signed in.' };

  const { data, error } = await supabase.rpc('get_villa_memos', { p_token: token });
  if (error) return { data: null, error: error.message };
  return { data: data || [], error: null };
}

export async function saveVillaMemo(memo: Record<string, unknown>) {
  const token = getSessionToken();
  if (!token) return { data: null, error: 'Not signed in.' };

  const { data, error } = await supabase.rpc('save_villa_memo', { p_token: token, p_memo: memo });
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function deleteVillaMemo(id: string) {
  const token = getSessionToken();
  if (!token) return { error: 'Not signed in.' };

  const { error } = await supabase.rpc('delete_villa_memo', { p_token: token, p_id: id });
  return { error: error ? error.message : null };
}

// ---------------------------------------------------------------------------
// Account administration (super admin only, enforced server-side).
// ---------------------------------------------------------------------------

export async function setAccountPassword(target: string, newPassword: string) {
  const token = getSessionToken();
  if (!token) return { ok: false, error: 'Not signed in.' };

  const { data, error } = await supabase.rpc('set_account_password', {
    p_token: token,
    p_target: target,
    p_new_password: newPassword,
  });
  if (error) return { ok: false, error: error.message };
  if (!data || data.ok !== true) return { ok: false, error: (data && data.error) || 'Could not update password.' };
  return { ok: true, error: null };
}

export async function createStaffMember(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
  avatarUrl?: string;
}) {
  const token = getSessionToken();
  if (!token) return { ok: false, error: 'Not signed in.' };

  const { data, error } = await supabase.rpc('create_staff_member', {
    p_token: token,
    p_name: input.name,
    p_email: input.email,
    p_phone: input.phone,
    p_password: input.password,
    p_avatar_url: input.avatarUrl || null,
  });
  if (error) return { ok: false, error: error.message };
  if (!data || data.ok !== true) return { ok: false, error: (data && data.error) || 'Could not add staff member.' };
  return { ok: true, error: null };
}

export async function fetchAuthConfig() {
  const token = getSessionToken();
  if (!token) return { data: null, error: 'Not signed in.' };

  const { data, error } = await supabase.rpc('get_auth_config', { p_token: token });
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function updateAuthConfig(input: {
  superAdminEmail: string;
  ownerEmail: string;
  ownerName: string;
}) {
  const token = getSessionToken();
  if (!token) return { ok: false, error: 'Not signed in.' };

  const { data, error } = await supabase.rpc('update_auth_config', {
    p_token: token,
    p_super_admin_email: input.superAdminEmail,
    p_owner_email: input.ownerEmail,
    p_owner_name: input.ownerName,
  });
  if (error) return { ok: false, error: error.message };
  if (!data || data.ok !== true) return { ok: false, error: 'Could not update configuration.' };
  return { ok: true, error: null };
}
