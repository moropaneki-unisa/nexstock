'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export default function OnboardingPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    try {
      setLoading(true);
      setError('');

      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      await apiFetch('/api/organization', {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          industry,
          slug,
          onboardingComplete: true,
        }),
      });

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black text-white px-4">
      <div className="w-full max-w-lg p-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
        <div className="mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-5 text-2xl">
            🚀
          </div>

          <h1 className="text-3xl font-bold tracking-tight mb-3">
            Set up your workspace
          </h1>

          <p className="text-zinc-400 leading-6">
            Configure your organization to start managing inventory, products and integrations.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-sm text-zinc-300 font-medium">Organization Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nexstock Ltd"
              className="w-full mt-2 p-4 rounded-2xl bg-black/60 border border-zinc-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-300 font-medium">Industry</label>
            <input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="Retail, SaaS, Logistics"
              className="w-full mt-2 p-4 rounded-2xl bg-black/60 border border-zinc-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm p-4 rounded-2xl">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !name}
            className="w-full bg-white text-black py-4 rounded-2xl font-semibold hover:bg-zinc-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating workspace...' : 'Continue to dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
