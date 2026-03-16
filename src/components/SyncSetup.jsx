import { useState, useEffect, useRef } from 'react';
import {
  startDeviceFlow, setSyncToken, findOrCreateGist, setSyncGistId,
} from '../lib/gistSync.js';

const CLIENT_ID = '178c6fc778ccc68e1d6a';

// Single poll attempt — returns token string or null (pending) or throws on hard error
async function checkOnce(deviceCode) {
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
  if (data.error === 'access_denied') throw new Error('Authorization denied by GitHub.');
  if (data.error === 'expired_token') throw new Error('Code expired. Please try again.');
  return null; // authorization_pending or slow_down
}

export default function SyncSetup({ onComplete }) {
  const [step, setStep] = useState('intro'); // intro | code | checking | error
  const [userCode, setUserCode] = useState('');
  const [verifyUrl, setVerifyUrl] = useState('');
  const [deviceCode, setDeviceCode] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const intervalRef = useRef(null);

  const handleConnect = async () => {
    try {
      setStep('code');
      setError('');
      const flow = await startDeviceFlow();
      setUserCode(flow.user_code);
      setVerifyUrl(flow.verification_uri);
      setDeviceCode(flow.device_code);
    } catch (err) {
      setStep('error');
      setError('Could not reach GitHub. Check your connection and try again.');
    }
  };

  const finishAuth = async (token) => {
    try {
      setSyncToken(token);
      const gistId = await findOrCreateGist(token);
      setSyncGistId(gistId);
      onComplete(token, gistId);
    } catch (err) {
      setStep('error');
      setError('Authorized but failed to set up storage. Try again.');
    }
  };

  const handleCheck = async () => {
    if (!deviceCode || checking) return;
    setChecking(true);
    try {
      const token = await checkOnce(deviceCode);
      if (token) {
        await finishAuth(token);
      } else {
        // still pending — give feedback
        setChecking(false);
      }
    } catch (err) {
      setStep('error');
      setError(err.message);
    }
  };

  // Background polling every 6s (pauses on mobile but that's fine — user taps the button)
  useEffect(() => {
    if (step !== 'code' || !deviceCode) return;
    intervalRef.current = setInterval(() => {
      checkOnce(deviceCode)
        .then((token) => { if (token) finishAuth(token); })
        .catch((err) => { setStep('error'); setError(err.message); });
    }, 6000);
    return () => clearInterval(intervalRef.current);
  }, [step, deviceCode]);

  // Re-check when user returns to this tab (mobile visibility change)
  useEffect(() => {
    if (step !== 'code' || !deviceCode) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') handleCheck();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [step, deviceCode, checking]);

  return (
    <div className="fixed inset-0 bg-zinc-950/95 backdrop-blur z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">

        {step === 'intro' && (
          <>
            <div className="text-4xl mb-4">🔄</div>
            <h2 className="text-xl font-bold text-white mb-2">Enable Cross-Device Sync</h2>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              Your data will sync instantly between your phone and desktop via a private GitHub Gist.
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

        {step === 'code' && (
          <>
            <div className="text-4xl mb-4">📱</div>
            <h2 className="text-xl font-bold text-white mb-1">Two steps</h2>
            <p className="text-zinc-400 text-sm mb-5">
              Open GitHub, enter the code, then come back here and tap the button below.
            </p>

            {/* Step 1 */}
            <div className="mb-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Step 1 — Open this link</p>
              <a
                href={verifyUrl || 'https://github.com/login/device'}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-emerald-400 text-sm font-medium hover:border-emerald-700 transition-colors"
              >
                🔗 github.com/login/device
              </a>
            </div>

            {/* Step 2 */}
            {userCode && (
              <div className="mb-5">
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Step 2 — Enter this code</p>
                <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-white tracking-widest font-mono">{userCode}</p>
                </div>
              </div>
            )}

            {/* Manual check button — key for mobile */}
            <button
              onClick={handleCheck}
              disabled={checking || !userCode}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition-all active:scale-95 mb-3"
            >
              {checking ? '⏳ Checking…' : "✓ I've authorized — continue"}
            </button>

            <p className="text-center text-xs text-zinc-600">
              Or just come back to this tab after authorizing and it will detect automatically.
            </p>
          </>
        )}

        {step === 'error' && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-white mb-2">Authorization failed</h2>
            <p className="text-zinc-400 text-sm mb-6">{error || 'Something went wrong. Try again.'}</p>
            <button
              onClick={() => { setStep('intro'); setDeviceCode(''); setUserCode(''); }}
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
