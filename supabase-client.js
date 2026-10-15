(() => {
  const config = window.SLE_SUPABASE_CONFIG || {};
  const configured = /^https:\/\/.+\.supabase\.co$/i.test(config.url || "") && Boolean(config.publishableKey) && Boolean(window.supabase?.createClient);
  const localHost = ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
  const localDemo = localHost && (!configured || new URLSearchParams(location.search).get("demo") === "1");
  const client = configured && !localDemo && window.supabase?.createClient
    ? window.supabase.createClient(config.url, config.publishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;
  const cachePrefix = "sle-log-cloud-cache-v1:";
  let activeUser = null;
  let saveTimer = null;
  let pendingState = null;

  const normalizeUsername = value => String(value || "").trim().toLowerCase();
  async function usernameForAuth(value) {
    const bytes = new TextEncoder().encode(normalizeUsername(value));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
    return `${hash.slice(0, 40)}@users.sle-log.local`;
  }
  const cleanState = value => {
    const result = JSON.parse(JSON.stringify(value || {}));
    delete result.account;
    delete result.session;
    return result;
  };
  const cacheKey = userId => `${cachePrefix}${userId}`;
  const readCache = userId => {
    try { return JSON.parse(localStorage.getItem(cacheKey(userId))); }
    catch { return null; }
  };
  const writeCache = (userId, value) => {
    if (!userId) return;
    localStorage.setItem(cacheKey(userId), JSON.stringify(cleanState(value)));
  };
  const clearCache = userId => { if (userId) localStorage.removeItem(cacheKey(userId)); };
  const request = async (operation, fallback = {}) => {
    try {
      return await operation();
    } catch (error) {
      return { ...fallback, error };
    }
  };

  async function getSession() {
    if (!client) return { user: null, error: null };
    const { data, error } = await request(() => client.auth.getSession(), { data: { session: null } });
    activeUser = data?.session?.user || null;
    return { user: activeUser, error };
  }
  async function loadState() {
    if (!client || !activeUser) return { state: null, error: null };
    const { data, error } = await request(() => client.from("user_app_state").select("state, updated_at").eq("user_id", activeUser.id).maybeSingle(), { data: null });
    if (error) return { state: readCache(activeUser.id), error };
    if (data?.state) writeCache(activeUser.id, data.state);
    return { state: data?.state || readCache(activeUser.id), updatedAt: data?.updated_at || null, error: null };
  }
  async function saveState(value) {
    if (!client || !activeUser) return { error: new Error("尚未登录 Supabase") };
    const state = cleanState(value);
    writeCache(activeUser.id, state);
    const { error } = await request(() => client.from("user_app_state").upsert({ user_id: activeUser.id, state }, { onConflict: "user_id" }));
    window.dispatchEvent(new CustomEvent("sle:cloud-sync", { detail: { ok: !error, error } }));
    return { error };
  }
  function queueSave(value) {
    if (!client || !activeUser) return;
    pendingState = cleanState(value);
    clearTimeout(saveTimer);
    window.dispatchEvent(new CustomEvent("sle:cloud-sync", { detail: { pending: true } }));
    saveTimer = setTimeout(() => { const next = pendingState; pendingState = null; saveState(next); }, 450);
  }
  async function flush(value) {
    clearTimeout(saveTimer);
    pendingState = null;
    return saveState(value);
  }
  async function signIn(username, password) {
    const result = await request(async () => client.auth.signInWithPassword({ email: await usernameForAuth(username), password }), { data: { user: null, session: null } });
    activeUser = result.data?.user || null;
    return result;
  }
  async function signUp(username, password, nickname) {
    const result = await request(async () => client.auth.signUp({ email: await usernameForAuth(username), password, options: { data: { nickname, username: normalizeUsername(username) } } }), { data: { user: null, session: null } });
    activeUser = result.data?.user || null;
    return result;
  }
  async function signOut() { const result = await request(() => client.auth.signOut()); activeUser = null; return result; }
  async function reauthenticate(username, password) { return request(async () => client.auth.signInWithPassword({ email: await usernameForAuth(username), password }), { data: { user: null, session: null } }); }
  async function updatePassword(password) { return request(() => client.auth.updateUser({ password })); }
  async function resetPasswordByUsername(username, password) { return request(() => client.rpc("reset_password_by_username", { target_username: normalizeUsername(username), new_password: password })); }
  async function updateUsername(username) {
    const normalized = normalizeUsername(username);
    const result = await request(async () => client.auth.updateUser({ email: await usernameForAuth(normalized), data: { username: normalized } }), { data: { user: null } });
    if (!result.error && activeUser) {
      activeUser = result.data?.user || activeUser;
      const { error } = await request(() => client.from("profiles").update({ username: normalized }).eq("user_id", activeUser.id));
      if (error) return { ...result, error };
    }
    return result;
  }
  async function deleteAccount() {
    if (!activeUser) return { error: new Error("尚未登录") };
    const userId = activeUser.id;
    const result = await request(() => client.rpc("delete_current_user"));
    if (!result.error) { clearCache(userId); activeUser = null; }
    return result;
  }

  window.SLECloud = {
    configured, localDemo, client,
    get user() { return activeUser; },
    getSession, loadState, saveState, queueSave, flush,
    signIn, signUp, signOut, reauthenticate, updatePassword, resetPasswordByUsername, updateUsername, deleteAccount,
    writeCache, clearCache
  };
})();
