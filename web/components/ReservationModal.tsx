'use client';

import { useState } from 'react';
import type { DealWithVenue } from '@api-types';
import { createReservation } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getNextOccurrence(daysOfWeek: number[]): string {
  const today = new Date();
  const todayDay = today.getDay();

  let minDays = Infinity;
  for (const day of daysOfWeek) {
    let daysAhead = day - todayDay;
    if (daysAhead < 0) daysAhead += 7;
    if (daysAhead < minDays) minDays = daysAhead;
  }

  const result = new Date(today);
  result.setDate(today.getDate() + (minDays === Infinity ? 0 : minDays));
  const year = result.getFullYear();
  const month = String(result.getMonth() + 1).padStart(2, '0');
  const day = String(result.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${ampm}`;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

interface ConfirmedReservation {
  id: string;
  name: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  venue_name: string;
}

interface Props {
  deal: DealWithVenue;
  onClose: () => void;
}

const inputClass =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100';

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-900">{value}</span>
    </div>
  );
}

export default function ReservationModal({ deal, onClose }: Props) {
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState(() => getNextOccurrence(deal.day_of_week));
  const [time, setTime] = useState(deal.start_time.slice(0, 5));
  const [specialRequests, setSpecialRequests] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<ConfirmedReservation | null>(null);

  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const days = deal.day_of_week.map((d) => DAY_NAMES[d]).join(', ');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const reservation = await createReservation({
        venue_id: deal.venue.id,
        deal_id: deal.id,
        name,
        email,
        phone: phone || undefined,
        party_size: partySize,
        reservation_date: date,
        reservation_time: time,
        special_requests: specialRequests || undefined,
      });

      setConfirmed({
        id: reservation.id,
        name: reservation.name,
        party_size: reservation.party_size,
        reservation_date: reservation.reservation_date,
        reservation_time: reservation.reservation_time,
        venue_name: deal.venue.name,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create reservation. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reservation-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-amber-500 to-orange-500 px-6 py-5 text-white rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1.5 hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 id="reservation-title" className="text-lg font-bold pr-8">
            Reserve at {deal.venue.name}
          </h2>
          <p className="mt-1 text-sm text-amber-100">
            {formatTime(deal.start_time)} &ndash; {formatTime(deal.end_time)} &middot; {days}
          </p>
          <p className="mt-0.5 text-sm text-amber-100 italic">{deal.description}</p>
        </div>

        {confirmed ? (
          // Confirmation view
          <div className="px-6 py-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-8 w-8 text-green-600"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-1">You&apos;re all set!</h3>
            <p className="text-sm text-zinc-500 mb-6">Your spot has been reserved.</p>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left space-y-2.5 mb-6">
              <DetailRow label="Venue" value={confirmed.venue_name} />
              <DetailRow label="Name" value={confirmed.name} />
              <DetailRow label="Date" value={formatDate(confirmed.reservation_date)} />
              <DetailRow label="Time" value={formatTime(confirmed.reservation_time)} />
              <DetailRow
                label="Party size"
                value={`${confirmed.party_size} ${confirmed.party_size === 1 ? 'person' : 'people'}`}
              />
              <DetailRow
                label="Confirmation #"
                value={confirmed.id.slice(0, 8).toUpperCase()}
              />
            </div>

            <p className="text-xs text-zinc-400 mb-6">
              Please arrive a few minutes early. Show your confirmation number at the venue.
            </p>

            <button
              onClick={onClose}
              className="w-full rounded-xl bg-amber-500 py-3 font-semibold text-white hover:bg-amber-600 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          // Form view
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Field label="Your name" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                required
                className={inputClass}
              />
            </Field>

            <Field label="Email address" required>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                required
                className={inputClass}
              />
            </Field>

            <Field label="Phone number">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 555-5555"
                className={inputClass}
              />
            </Field>

            <Field label="Party size" required>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPartySize((p) => Math.max(1, p - 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition-colors text-xl font-medium select-none"
                >
                  &minus;
                </button>
                <span className="min-w-[2.5rem] text-center text-lg font-semibold text-zinc-900">
                  {partySize}
                </span>
                <button
                  type="button"
                  onClick={() => setPartySize((p) => Math.min(20, p + 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition-colors text-xl font-medium select-none"
                >
                  +
                </button>
                <span className="text-sm text-zinc-400">
                  {partySize === 1 ? 'person' : 'people'}
                </span>
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Date" required>
                <input
                  type="date"
                  value={date}
                  min={minDate}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className={inputClass}
                />
              </Field>
              <Field label="Time" required>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Special requests">
              <textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Dietary restrictions, accessibility needs, special occasions..."
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </Field>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-amber-500 py-3 font-semibold text-white hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Reserving...
                </>
              ) : (
                'Confirm Reservation'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
