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

      await apiFetch('/api/organizations', {
        method: 'POST',
        body: JSON.stringify({
          name,
          industry,
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <div className="w-full max-w-lg p-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl">

        <h1 className="text-3xl font-semibold mb-2">
          Set up your workspace
        </h1>

        <p className="text-gray-400 mb-8">
          Let’s create your organization so you can start using InventoryHub.
        </p>

        <div className="space-y-5">

          <div>
            <label className="text-sm text-gray-400">Organization Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Inc"
              className="w-full mt-2 p-3 rounded-lg bg-black border border-gray-700 focus:border-white outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400">Industry</label>
            <input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Retail, SaaS, Logistics"
              className="w-full mt-2 p-3 rounded-lg bg-black border border-gray-700 focus:border-white outline-none"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-white text-black py-3 rounded-lg font-medium hover:bg-gray-200 transition"
          >
            {loading ? 'Creating workspace...' : 'Continue to dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
