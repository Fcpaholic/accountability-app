import { useState, useEffect } from 'react';
import { startDeviceFlow, pollDeviceToken, setSyncToken, findOrCreateGist, setSyncGistId } from '../lib/gistSync.js';

export default function SyncSetup({ onComplete }) {
  const [step, setStep] = useState('intro'); // intro | polling | error
  const [userCode, setUserCode] = useState('');
  const [verifyUrl, setVerifyUrl] = useState('');
  const [pollCount, setPollCount] = useState(0);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    try {
      setStep('polling');
      setError('');

      const flow = await startDeviceFlow();
      setUserCode(flow.user_code);
      setVerifyUrl(flow.verification_uri);

      const token = await pollDeviceToken(
        flow.device_code,
        flow.interval,
        () => setPollCount((n) => n + 1)
      );

      setSyncToken(token);
      const gistId = await findOrCreateGist(token);
      setSyncGistId(gistId);
      onComplete(token, gistId);
    } catch (err) {
      setStep('error');
      setError(err.message === 'access_denied' ? 'Authorization denied.' : err.message);
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
              Your data will sync instantly between your phone, tablet, and desktop via a private GitHub Gist.
              You'll only need to do this once per device.
            </p>
            <div className="bg-zinc-800 rounded-lg p-4 mb-6 space-y-2 text-xs text-zinc-400">
              <div className="flex gap-2"><span>✓</span><span>Private — only you can see the data</span></div>
              <div className="flex gap-2"><span>✓</span><span>Free — uses your GitHub account</span></div>
              <div className="flex gap-2"><span>✓</span><span>Instant sync across all devices</span></div>
            </div>
            <button
              onClick={handleConnect}
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

        {step === 'polling' && (
          <>
            <div className="text-4xl mb-4">⏳</div>
            <h2 className="text-xl font-bold text-white mb-2">Authorize on GitHub</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Open this link and enter the code below:
            </p>

            <a
              href={verifyUrl || 'https://github.com/login/device'}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-emerald-400 text-sm font-medium mb-4 hover:border-emerald-700 transition-colors"
            >
              🔗 {verifyUrl || 'https://github.com/login/device'}
            </a>

            {userCode && (
              <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-center mb-6">
                <p className="text-xs text-zinc-500 mb-1">Enter this code</p>
                <p className="text-3xl font-bold text-white tracking-widest font-mono">{userCode}</p>
              </div>
            )}

            <div className="flex items-center gap-3 text-zinc-500 text-sm">
              <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin shrink-0" />
              <span>Waiting for authorization{'.'.repeat((pollCount % 3) + 1)}</span>
            </div>
          </>
        )}

        {step === 'error' && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-white mb-2">Authorization failed</h2>
            <p className="text-zinc-400 text-sm mb-6">{error || 'Something went wrong. Try again.'}</p>
            <button
              onClick={() => setStep('intro')}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl py-3 transition-all"
            >
              Try again
            </button>
            <button
              onClick={() => onComplete(null, null)}
              className="w-full mt-3 text-zinc-600 hover:text-zinc-400 text-sm py-2 transition-colors"
            >
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
