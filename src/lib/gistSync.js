const GIST_FILENAME = 'accountability_v1.json';
const TOKEN_KEY = 'gh_sync_token';
const GIST_ID_KEY = 'gh_sync_gist_id';

export const getSyncToken = () => localStorage.getItem(TOKEN_KEY);
export const setSyncToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const getSyncGistId = () => localStorage.getItem(GIST_ID_KEY);
export const setSyncGistId = (id) => localStorage.setItem(GIST_ID_KEY, id);
export const clearSyncToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(GIST_ID_KEY);
};

const gh = (token, path, opts = {}) =>
  fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json', ...opts.headers },
  });

// Always search by filename — never trust a cached ID
export const findOrCreateGist = async (token) => {
  const res = await gh(token, '/gists');
  const gists = await res.json();
  if (Array.isArray(gists)) {
    const found = gists.find((g) => g.files?.[GIST_FILENAME]);
    if (found) { setSyncGistId(found.id); return found.id; }
  }
  const created = await gh(token, '/gists', {
    method: 'POST',
    body: JSON.stringify({
      description: 'Accountability App sync',
      public: false,
      files: { [GIST_FILENAME]: { content: JSON.stringify({ days: {} }) } },
    }),
  }).then((r) => r.json());
  if (!created.id) throw new Error('Failed to create gist');
  setSyncGistId(created.id);
  return created.id;
};

export const fetchFromGist = async (token, gistId) => {
  const res = await gh(token, `/gists/${gistId}`);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const gist = await res.json();
  const content = gist.files?.[GIST_FILENAME]?.content;
  return content ? JSON.parse(content) : null;
};

export const pushToGist = async (token, gistId, data) => {
  const res = await gh(token, `/gists/${gistId}`, {
    method: 'PATCH',
    body: JSON.stringify({ files: { [GIST_FILENAME]: { content: JSON.stringify(data) } } }),
  });
  if (!res.ok) throw new Error(`Push failed: ${res.status}`);
};
