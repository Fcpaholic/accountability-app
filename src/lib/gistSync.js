// GitHub Gist-based sync backend.
// Uses GitHub's Device Authorization Flow (RFC 8628) — no server needed.
// Data is stored in a private Gist owned by the user's GitHub account.

const CLIENT_ID = '178c6fc778ccc68e1d6a'; // GitHub CLI public client ID (supports device flow)
const GIST_FILENAME = 'accountability_v1.json';

const TOKEN_KEY = 'gh_sync_token';
const GIST_ID_KEY = 'gh_sync_gist_id';

export const getSyncToken = () => localStorage.getItem(TOKEN_KEY);
export const setSyncToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearSyncToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(GIST_ID_KEY);
};
export const getSyncGistId = () => localStorage.getItem(GIST_ID_KEY);
export const setSyncGistId = (id) => localStorage.setItem(GIST_ID_KEY, id);

// ─── OAuth Device Flow ────────────────────────────────────────────────────────

export const startDeviceFlow = async () => {
  const res = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, scope: 'gist' }),
  });
  if (!res.ok) throw new Error('Failed to start device flow');
  return res.json(); // { device_code, user_code, verification_uri, interval, expires_in }
};

export const pollDeviceToken = async (deviceCode, intervalSecs, onTick) => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let interval = Math.max(intervalSecs, 5) * 1000;

  for (let i = 0; i < 120; i++) {
    await sleep(interval);
    onTick?.();

    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    const data = await res.json();

    if (data.access_token) return data.access_token;
    if (data.error === 'access_denied') throw new Error('access_denied');
    if (data.error === 'expired_token') throw new Error('expired_token');
    if (data.error === 'slow_down') interval += 5000;
    // 'authorization_pending' → keep polling
  }

  throw new Error('Timeout waiting for authorization');
};

// ─── Gist operations ─────────────────────────────────────────────────────────

export const findOrCreateGist = async (token) => {
  // Always search by filename — never trust cache, in case device has stale/wrong ID
  const gists = await fetch('https://api.github.com/gists', {
    headers: { Authorization: `token ${token}` },
  }).then((r) => r.json());

  if (Array.isArray(gists)) {
    const existing = gists.find((g) => g.files?.[GIST_FILENAME]);
    if (existing) {
      setSyncGistId(existing.id);
      return existing.id;
    }
  }

  const newGist = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: 'Accountability App — sync data',
      public: false,
      files: { [GIST_FILENAME]: { content: JSON.stringify({ days: {} }) } },
    }),
  }).then((r) => r.json());

  if (!newGist.id) throw new Error('Failed to create gist');
  setSyncGistId(newGist.id);
  return newGist.id;
};

export const fetchFromGist = async (token, gistId) => {
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: { Authorization: `token ${token}` },
  });
  if (!res.ok) throw new Error(`Gist fetch failed: ${res.status}`);
  const gist = await res.json();
  const content = gist.files?.[GIST_FILENAME]?.content;
  if (!content) return null;
  return JSON.parse(content);
};

export const pushToGist = async (token, gistId, data) => {
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      files: { [GIST_FILENAME]: { content: JSON.stringify(data) } },
    }),
  });
  if (!res.ok) throw new Error(`Gist push failed: ${res.status}`);
};

// ─── Merge strategy ───────────────────────────────────────────────────────────
// For each day, take the most complete data from either source.
// This handles the case where two devices each logged different things.

export const mergeData = (local, remote) => {
  const result = { days: {} };
  const allDays = new Set([
    ...Object.keys(local?.days ?? {}),
    ...Object.keys(remote?.days ?? {}),
  ]);

  for (const day of allDays) {
    const l = local?.days?.[day];
    const r = remote?.days?.[day];

    if (!l && r) { result.days[day] = r; continue; }
    if (l && !r) { result.days[day] = l; continue; }

    // Both have data — merge field by field, taking the "more complete" value
    result.days[day] = {
      calories: l.calories ?? r.calories,
      gymSessions: Math.max(l.gymSessions || 0, r.gymSessions || 0),
      runs: (l.runs?.length ?? 0) >= (r.runs?.length ?? 0) ? l.runs : r.runs,
      weight: l.weight ?? r.weight,
    };
  }

  return result;
};
