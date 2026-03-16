import { useState } from 'react';
import { setSyncToken, findOrCreateGist, setSyncGistId } from '../lib/gistSync.js';

export default function SyncSetup({ onComplete }) {
  const [step, setStep] = useState('intro'); // intro | token
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    const token = tokenInput.trim();
    if (!token) return;
    setVerifying(true);
    setError('');
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: { Authorization: `token ${token}` },
      });
      if (!res.ok) throw new Error('Token rejected by GitHub (status ' + res.status + ')');
      setSyncToken(token);
      const gistId = await findOrCreateGist(token);
      setSyncGistId(gistId);
      onComplete(token, gistId);
    } catch (err) {
      setVerifying(false);
      setError(err.message || 'Could not connect. Check the token and try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/95 backdrop-blur z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">

        {step === 'intro' && (
          <>
            <div className="text-4xl mb-4">🔄</div>
            <h2 className="text-xl font-bold text-white mb-2">Enable Cross-Device Sync</h2>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              Syncs your data between phone and desktop via a private GitHub Gist.
              Requires a free GitHub account.
            </p>
            <div className="bg-zinc-800 rounded-lg p-4 mb-6 space-y-2 text-xs text-zinc-400">
              <div className="flex gap-2"><span>✓</span><span>Private — only you can see the data</span></div>
              <div className="flex gap-2"><span>✓</span><span>Free — uses your GitHub account</span></div>
              <div className="flex gap-2"><span>✓</span><span>Works on any browser, any device</span></div>
            </div>
            <button
              onClick={() => setStep('token')}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl py-3 transition-all active:scale-95"
            >
              Connect GitHub →
            </button>
            <button
              onClick={() => onComplete(null, null)}
              className="w-full mt-3 text-zinc-600 hover:text-zinc-400 text-sm py-2 transition-colors"
            >
              Skip — use this device only
            </button>
          </>
        )}

        {step === 'token' && (
          <>
            <div className="text-4xl mb-4">🔑</div>
            <h2 className="text-xl font-bold text-white mb-4">Paste a GitHub Token</h2>

            <div className="bg-zinc-800 rounded-xl p-4 mb-5 space-y-3 text-sm">
              <p className="text-zinc-300 font-medium">Create a token in 30 seconds:</p>
              <ol className="space-y-2 text-zinc-400 text-xs list-decimal list-inside">
                <li>
                  Open{' '}
                  <a
                    href="https://github.com/settings/tokens/new?scopes=gist&description=Accountability+Sync"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 underline"
                  >
                    github.com/settings/tokens/new
                  </a>
                </li>
                <li>Set <strong className="text-white">Expiration</strong> to "No expiration"</li>
                <li>Make sure <strong className="text-white">gist</strong> is checked</li>
                <li>Click <strong className="text-white">Generate token</strong></li>
                <li>Copy the token (starts with <code className="text-emerald-400">ghp_</code>)</li>
                <li>Paste it below and tap Connect</li>
              </ol>
            </div>

            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-3 text-white text-sm font-mono mb-3 focus:outline-none focus:border-emerald-500 placeholder-zinc-600"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />

            {error && (
              <p className="text-red-400 text-xs mb-3">{error}</p>
            )}

            <button
              onClick={handleVerify}
              disabled={verifying || !tokenInput.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition-all active:scale-95"
            >
              {verifying ? '⏳ Connecting…' : 'Connect →'}
            </button>
            <button
              onClick={() => setStep('intro')}
              className="w-full mt-3 text-zinc-600 hover:text-zinc-400 text-sm py-2 transition-colors"
            >
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
