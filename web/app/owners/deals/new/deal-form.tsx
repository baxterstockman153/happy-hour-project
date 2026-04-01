'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOwnerAuth } from '@/lib/owner-auth-context';
import { createOwnerDeal } from '@/lib/api';
import type { DealType } from '@api-types';

const DEAL_TYPES: { value: DealType; label: string }[] = [
  { value: 'drinks', label: 'Drinks' },
  { value: 'food', label: 'Food' },
  { value: 'both', label: 'Both' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const inputClass =
  'mt-1.5 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20';

const labelClass =
  'block text-sm font-medium text-zinc-700 dark:text-zinc-300';

export default function NewDealForm() {
  const searchParams = useSearchParams();
  const venueId = searchParams.get('venueId');
  const { owner, loading: authLoading } = useOwnerAuth();
  const router = useRouter();

  const [description, setDescription] = useState('');
  const [dealType, setDealType] = useState<DealType>('drinks');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !owner) {
      router.replace('/owners/login');
    }
  }, [authLoading, owner, router]);

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!venueId) return;
    setError(null);

    if (daysOfWeek.length === 0) {
      setError('Please select at least one day of the week.');
      return;
    }

    setSubmitting(true);

    try {
      await createOwnerDeal(venueId, {
        description,
        deal_type: dealType,
        day_of_week: daysOfWeek.sort((a, b) => a - b),
        start_time: startTime,
        end_time: endTime,
        is_active: isActive,
      });
      router.push('/owners/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create deal.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !owner) {
    return <div className="flex min-h-full items-center justify-center"><p className="text-sm text-zinc-500">Loading...</p></div>;
  }

  if (!venueId) {
    return <div className="flex min-h-full items-center justify-center"><p className="text-sm text-red-500">Missing venue ID.</p></div>;
  }

  return (
    <div className="flex min-h-full flex-1 items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Add New Deal</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Create a happy hour deal for your venue.</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">{error}</div>
            )}

            <div><label htmlFor="description" className={labelClass}>Description <span className="text-red-500">*</span></label><textarea id="description" required rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Half-price craft cocktails and $5 appetizers" className={inputClass} /></div>

            <div><label htmlFor="dealType" className={labelClass}>Deal Type <span className="text-red-500">*</span></label>
              <select id="dealType" required value={dealType} onChange={(e) => setDealType(e.target.value as DealType)} className={inputClass}>
                {DEAL_TYPES.map((dt) => (<option key={dt.value} value={dt.value}>{dt.label}</option>))}
              </select>
            </div>

            <fieldset>
              <legend className={labelClass}>Days of Week <span className="text-red-500">*</span></legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const selected = daysOfWeek.includes(day.value);
                  return (
                    <button key={day.value} type="button" onClick={() => toggleDay(day.value)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${selected ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950 dark:text-indigo-300' : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'}`}>
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-4">
              <div><label htmlFor="startTime" className={labelClass}>Start Time <span className="text-red-500">*</span></label><input id="startTime" type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} /></div>
              <div><label htmlFor="endTime" className={labelClass}>End Time <span className="text-red-500">*</span></label><input id="endTime" type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} /></div>
            </div>

            <div className="flex items-center gap-3">
              <input id="isActive" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-600 dark:bg-zinc-800 dark:focus:ring-indigo-400" />
              <label htmlFor="isActive" className={labelClass}>Active</label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={() => router.push('/owners/dashboard')} className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">Cancel</button>
              <button type="submit" disabled={submitting} className="flex items-center justify-center rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:focus:ring-offset-zinc-900">
                {submitting ? 'Creating...' : 'Create Deal'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
