'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get('email') || '');
  }, []);

  async function verify() {
    try {
      setLoading(true);
      setError('');
      setMessage('');

      await apiFetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      router.push('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    try {
      setResending(true);
      setError('');
      setMessage('');

      await apiFetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      setMessage('A new verification code has been sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.15),transparent_40%)]" />

      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl shadow-2xl p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 border border-indigo-500/30">
            <span className="text-2xl">✉️</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight">Verify your email</h1>

          <p className="mt-3 text-sm text-zinc-400 leading-6">
            Enter the 6-digit verification code sent to
            <br />
            <span className="text-white font-medium">{email}</span>
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Verification Code
            </label>

            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              maxLength={6}
              className="w-full rounded-2xl border border-zinc-800 bg-black/60 px-4 py-4 text-center text-2xl tracking-[0.5em] outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />

            <p className="mt-2 text-xs text-zinc-500">
              The verification code expires in 5 minutes.
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {message}
            </div>
          )}

          <button
            onClick={verify}
            disabled={loading || otp.length !== 6}
            className="w-full rounded-2xl bg-white text-black py-4 font-semibold transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>

          <button
            onClick={resend}
            disabled={resending}
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 text-sm font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            {resending ? 'Sending...' : 'Resend verification code'}
          </button>
        </div>
      </div>
    </div>
  );
}
