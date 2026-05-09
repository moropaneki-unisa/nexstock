'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Rocket } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { NexstockLogo } from '@/components/brand/nexstock-logo';

export default function OnboardingPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your organization name.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const slug = trimmed
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      await apiFetch('/api/organization', {
        method: 'PATCH',
        body: JSON.stringify({
          name: trimmed,
          industry: industry.trim() || undefined,
          slug,
          onboardingComplete: true,
        }),
      });

      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Could not save your workspace. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#06111f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(63,117,255,0.32),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(35,224,190,0.26),transparent_28%),radial-gradient(circle_at_52%_88%,rgba(143,77,255,0.22),transparent_34%),linear-gradient(180deg,#050b16_0%,#071a2f_45%,#06111f_100%)]" />
      <div className="absolute inset-0 opacity-[0.10] [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-white/[0.045] p-8 shadow-[0_40px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:p-10">
          <div className="mb-8 flex items-center justify-between">
            <NexstockLogo light />
          </div>

          <div className="mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6d5dfc] via-[#2f7cff] to-[#25e0be] shadow-[0_18px_60px_rgba(47,124,255,0.35)]">
              <Rocket className="h-6 w-6 text-white" />
            </div>

            <h1 className="mt-6 text-3xl font-bold tracking-[-0.03em]">
              Set up your workspace
            </h1>

            <p className="mt-3 leading-6 text-slate-300">
              Tell us about your organization. You can change these details later in settings.
            </p>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!loading) handleSubmit();
            }}
            className="space-y-5"
          >
            <div>
              <label htmlFor="org-name" className="text-sm font-medium text-slate-200">
                Organization name
              </label>
              <input
                id="org-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Acme Trading Co."
                autoFocus
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
              />
            </div>

            <div>
              <label htmlFor="org-industry" className="text-sm font-medium text-slate-200">
                Industry <span className="text-slate-500">(optional)</span>
              </label>
              <input
                id="org-industry"
                value={industry}
                onChange={(event) => setIndustry(event.target.value)}
                placeholder="Retail, SaaS, Logistics, Wholesale…"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6d5dfc] via-[#2f7cff] to-[#25e0be] py-4 text-sm font-bold text-white shadow-[0_24px_70px_rgba(47,124,255,0.35)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating workspace…
                </>
              ) : (
                'Continue to dashboard'
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
