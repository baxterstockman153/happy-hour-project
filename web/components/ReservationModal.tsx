'use client';

import { useState, useEffect } from 'react';
import type { DealWithVenue } from '@api-types';
import { createReservation, type ReservationConfirmation } from '@/lib/api';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${ampm}`;
}

/** Returns the next N dates (from today) that fall on one of the allowed weekdays. */
function getUpcomingDates(daysOfWeek: number[], count = 14): string[] {
  const results: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cursor = new Date(today);

  while (results.length < count) {
    if (daysOfWeek.includes(cursor.getDay())) {
      // Format as YYYY-MM-DD in local time
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, '0');
      const d = String(cursor.getDate()).padStart(2, '0');
      results.push(`${y}-${m}-${d}`);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return results;
}

function formatDateDisplay(dateStr: string): string {
  // dateStr is YYYY-MM-DD; parse as local date to avoid timezone offset issues
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

interface Props {
  deal: DealWithVenue;
  defaultEmail?: string;
  onClose: () => void;
}

type Step = 'form' | 'submitting' | 'success';

export default function ReservationModal({ deal, defaultEmail = '', onClose }: Props) {
  const validDates = getUpcomingDates(deal.day_of_week);

  const [step, setStep] = useState<Step>('form');
  const [date, setDate] = useState(validDates[0] ?? '');
  const [partySize, setPartySize] = useState(2);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ReservationConfirmation | null>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !date) {
      setError('Please fill in all required fields.');
      return;
    }

    setStep('submitting');
    try {
      const result = await createReservation({
        deal_id: deal.id,
        venue_id: deal.venue_id,
        venue_name: deal.venue.name,
        date,
        party_size: partySize,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        special_requests: specialRequests.trim() || undefined,
      });
      setConfirmation(result.reservation);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStep('form');
    }
  }

  const validDayNames = deal.day_of_week.map((d) => DAY_NAMES[d]).join(', ');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-start justify-between rounded-t-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-white sm:rounded-t-2xl">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-amber-100">Reserve a table at</p>
            <h2 className="mt-0.5 truncate text-xl font-bold">{deal.venue.name}</h2>
            <p className="mt-1 text-sm text-amber-100">
              {formatTime(deal.start_time)} &ndash; {formatTime(deal.end_time)} &middot; {validDayNames}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 mt-0.5 shrink-0 rounded-full p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {step === 'success' && confirmation ? (
            <SuccessView confirmation={confirmation} onClose={onClose} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Date */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Date <span className="text-red-500">*</span>
                </label>
                <select
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                >
                  {validDates.map((d) => (
                    <option key={d} value={d}>
                      {formatDateDisplay(d)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Party size */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Party size <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPartySize((p) => Math.max(1, p - 1))}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 transition-colors hover:border-amber-400 hover:text-amber-600 disabled:opacity-40"
                    disabled={partySize <= 1}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                    </svg>
                  </button>
                  <span className="w-8 text-center text-lg font-semibold text-zinc-900">{partySize}</span>
                  <button
                    type="button"
                    onClick={() => setPartySize((p) => Math.min(20, p + 1))}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 transition-colors hover:border-amber-400 hover:text-amber-600 disabled:opacity-40"
                    disabled={partySize >= 20}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                  <span className="text-sm text-zinc-500">{partySize === 1 ? 'person' : 'people'}</span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-zinc-100 pt-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Your info</p>
              </div>

              {/* Name */}
              <div>
                <label htmlFor="res-name" className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="res-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="res-email" className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="res-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="res-phone" className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Phone <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <input
                  id="res-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 000-0000"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              {/* Special requests */}
              <div>
                <label htmlFor="res-requests" className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Special requests <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <textarea
                  id="res-requests"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Dietary restrictions, seating preferences..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={step === 'submitting'}
                className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-60"
              >
                {step === 'submitting' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Confirming...
                  </span>
                ) : (
                  'Confirm reservation'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function SuccessView({
  confirmation,
  onClose,
}: {
  confirmation: ReservationConfirmation;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-4 text-center">
      {/* Checkmark */}
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-8 w-8 text-green-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>

      <h3 className="text-xl font-bold text-zinc-900">You&apos;re booked!</h3>
      <p className="mt-1 text-sm text-zinc-500">A confirmation will be sent to {confirmation.email}</p>

      {/* Details card */}
      <div className="mt-5 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left">
        <dl className="space-y-2.5">
          <Row label="Confirmation" value={confirmation.id} mono />
          {confirmation.venue_name && <Row label="Venue" value={confirmation.venue_name} />}
          <Row label="Date" value={formatDateDisplay(confirmation.date)} />
          <Row label="Party size" value={`${confirmation.party_size} ${confirmation.party_size === 1 ? 'person' : 'people'}`} />
          <Row label="Name" value={confirmation.name} />
        </dl>
      </div>

      <button
        onClick={onClose}
        className="mt-5 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
      >
        Done
      </button>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-sm text-zinc-500">{label}</dt>
      <dd className={`text-right text-sm font-medium text-zinc-900 ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}
