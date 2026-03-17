import { useState } from 'react';
import { setSyncToken, findOrCreateGist, setSyncGistId } from '../lib/gistSync.js';

export default function SyncSetup({ onComplete }) {
  const [step, setStep] = useState('token');
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [username, setUsername] = useState('');
  const [confirmedToken, setConfirmedToken] = useState('');
  const [confirmedGistId, setConfirmedGistId] = useState('');

  const handleVerify = async () => {
    const token = tokenInput.trim();
    if (!token) return;
    setVerifying(true);
    setError('');
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: { Authorization: `token ${token}` },
      });
      if (!res.ok) throw new Error('Token rejected (status ' + res.status + '). Make sure you copied the full token.');
      const user = await res.json();
      const gistId = await findOrCreateGist(token);
      setUsername(user.login);
      setConfirmedToken(token);
      setConfirmedGistId(gistId);
      setStep('confirm');
    } catch (err) {
      setVerifying(false);
      setError(err.message || 'Could not connect.');
    }
  };

  const handleConfirm = () => {
    setSyncToken(confirmedToken);
    setSyncGistId(confirmedGistId);
    onComplete(confirmedToken, confirmedGistId);
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/95 backdrop-blur z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">

        {step === 'token' && (
          <>
            <div className="text-3xl mb-3">🔑</div>
            <h2 className="text-xl font-bold text-white mb-1">Connect GitHub to sync</h2>
            <p className="text-zinc-400 text-sm mb-5">
              Use the <strong className="text-white">same token</strong> on every device to sync data.
            </p>

            <div className="bg-zinc-800 rounded-xl p-4 mb-4 text-xs text-zinc-400 space-y-1.5">
              <p className="text-zinc-300 font-semibold text-sm mb-2">Create a GitHub token:</p>
              <p>1. Open <a href="https://github.com/settings/tokens/new?scopes=gist&description=Accountability+Sync" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">github.com/settings/tokens/new</a></p>
              <p>2. Expiration → <strong className="text-white">No expiration</strong></p>
              <p>3. Check the <strong className="text-white">gist</strong> box</p>
              <p>4. Click <strong className="text-white">Generate token</strong></p>
              <p>5. Copy it — <strong className="text-white">save it somewhere</strong> (notes app) so you can use it on other devices too</p>
              <p>6. Paste below</p>
            </div>

            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value.trim())}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-3 text-white text-sm font-mono mb-3 focus:outline-none focus:border-emerald-500 placeholder-zinc-600"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />

            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

            <button
              onClick={handleVerify}
              disabled={verifying || !tokenInput.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition-all active:scale-95"
            >
              {verifying ? '⏳ Verifying…' : 'Connect →'}
            </button>
            <button
              onClick={() => onComplete(null, null)}
              className="w-full mt-3 text-zinc-600 hover:text-zinc-400 text-sm py-2 transition-colors"
            >
              Skip — no sync
            </button>
          </>
        )}

        {step === 'confirm' && (
          <>
            <div className="text-3xl mb-3">✅</div>
            <h2 className="text-xl font-bold text-white mb-2">Connected!</h2>

            <div className="bg-zinc-800 rounded-xl p-4 mb-5">
              <p className="text-xs text-zinc-500 mb-1">GitHub account</p>
              <p className="text-white font-bold text-lg">@{username}</p>
              <p className="text-xs text-zinc-500 mt-2">Gist ID</p>
              <p className="text-zinc-400 text-xs font-mono">{confirmedGistId}</p>
            </div>

            <div className="bg-amber-950/50 border border-amber-800 rounded-xl p-3 mb-5 text-xs text-amber-300">
              Make sure you use the <strong>same GitHub account (@{username})</strong> on all your devices. If the other device shows a different username, disconnect it and reconnect with the same token.
            </div>

            <button
              onClick={handleConfirm}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl py-3 transition-all active:scale-95"
            >
              Start syncing →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
