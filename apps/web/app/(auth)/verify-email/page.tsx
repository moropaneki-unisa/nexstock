'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export default function VerifyEmailPage() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') || '';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function verify() {
    try {
      setLoading(true);
      setError('');

      await apiFetch('/auth/verify-email', {
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
    await apiFetch('/auth/resend-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    alert('OTP sent again');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white">
      <div className="w-full max-w-md p-8 bg-white/5 backdrop-blur rounded-xl border border-white/10">
        <h1 className="text-2xl font-semibold mb-2">Verify your email</h1>
        <p className="text-sm text-gray-400 mb-6">
          Enter the 6-digit code sent to <b>{email}</b>
        </p>

        <input
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="123456"
          className="w-full p-3 rounded bg-black border border-gray-700 mb-4 text-center tracking-widest text-lg"
        />

        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

        <button
          onClick={verify}
          disabled={loading}
          className="w-full bg-white text-black py-3 rounded font-medium"
        >
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>

        <button
          onClick={resend}
          className="w-full mt-4 text-sm text-gray-400 hover:text-white"
        >
          Resend code
        </button>
      </div>
    </div>
  );
}
