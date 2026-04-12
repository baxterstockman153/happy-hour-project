'use client';

import { useState, type FormEvent } from 'react';
import type { DealType } from '@api-types';
import Spinner from '@/components/ui/Spinner';
import ErrorBanner from '@/components/ui/ErrorBanner';

export interface DealFormData {
  description: string;
  dealType: DealType;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface DealFormProps {
  initialValues?: Partial<DealFormData>;
  submitLabel: string;
  onSubmit: (data: DealFormData) => Promise<void>;
  onCancel: () => void;
  accentColor?: 'indigo' | 'slate';
}

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

const labelClass = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300';

export default function DealForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
  accentColor = 'indigo',
}: DealFormProps) {
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [dealType, setDealType] = useState<DealType>(initialValues?.dealType ?? 'drinks');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(initialValues?.daysOfWeek ?? []);
  const [startTime, setStartTime] = useState(initialValues?.startTime ?? '');
  const [endTime, setEndTime] = useState(initialValues?.endTime ?? '');
  const [isActive, setIsActive] = useState(initialValues?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submitBtnClass =
    accentColor === 'slate'
      ? 'flex items-center justify-center rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-600 dark:hover:bg-slate-500 dark:focus:ring-offset-zinc-900'
      : 'flex items-center justify-center rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:focus:ring-offset-zinc-900';

  const selectedDayClass =
    accentColor === 'slate'
      ? 'border-slate-500 bg-slate-50 text-slate-700 dark:border-slate-400 dark:bg-slate-950 dark:text-slate-300'
      : 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950 dark:text-indigo-300';

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (daysOfWeek.length === 0) {
      setError('Please select at least one day of the week.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        description,
        dealType,
        daysOfWeek: daysOfWeek.slice().sort((a, b) => a - b),
        startTime,
        endTime,
        isActive,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <ErrorBanner message={error} />}

      <div>
        <label htmlFor="description" className={labelClass}>
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          required
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Half-price craft cocktails and $5 appetizers"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="dealType" className={labelClass}>
          Deal Type <span className="text-red-500">*</span>
        </label>
        <select
          id="dealType"
          required
          value={dealType}
          onChange={(e) => setDealType(e.target.value as DealType)}
          className={inputClass}
        >
          {DEAL_TYPES.map((dt) => (
            <option key={dt.value} value={dt.value}>
              {dt.label}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className={labelClass}>
          Days of Week <span className="text-red-500">*</span>
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map((day) => {
            const selected = daysOfWeek.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  selected
                    ? selectedDayClass
                    : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startTime" className={labelClass}>
            Start Time <span className="text-red-500">*</span>
          </label>
          <input
            id="startTime"
            type="time"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="endTime" className={labelClass}>
            End Time <span className="text-red-500">*</span>
          </label>
          <input
            id="endTime"
            type="time"
            required
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          id="isActive"
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-600 dark:bg-zinc-800 dark:focus:ring-indigo-400"
        />
        <label htmlFor="isActive" className={labelClass}>
          Active
        </label>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          Cancel
        </button>
        <button type="submit" disabled={submitting} className={submitBtnClass}>
          {submitting ? (
            <>
              <Spinner className="-ml-1 mr-2 h-4 w-4 text-white" />
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
}
