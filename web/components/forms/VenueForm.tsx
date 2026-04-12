'use client';

import { useState, type FormEvent } from 'react';
import type { VenueCategory } from '@api-types';
import Spinner from '@/components/ui/Spinner';
import ErrorBanner from '@/components/ui/ErrorBanner';

export interface VenueFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  category: VenueCategory;
}

interface VenueFormProps {
  initialValues?: Partial<VenueFormData>;
  submitLabel: string;
  onSubmit: (data: VenueFormData) => Promise<void>;
  onCancel: () => void;
  accentColor?: 'indigo' | 'slate';
}

const CATEGORIES: { value: VenueCategory; label: string }[] = [
  { value: 'bar', label: 'Bar' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'brewery', label: 'Brewery' },
  { value: 'lounge', label: 'Lounge' },
  { value: 'pub', label: 'Pub' },
  { value: 'winery', label: 'Winery' },
  { value: 'other', label: 'Other' },
];

const inputClass =
  'mt-1.5 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20';

const labelClass = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300';

export default function VenueForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
  accentColor = 'indigo',
}: VenueFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [address, setAddress] = useState(initialValues?.address ?? '');
  const [city, setCity] = useState(initialValues?.city ?? '');
  const [state, setState] = useState(initialValues?.state ?? '');
  const [zip, setZip] = useState(initialValues?.zip ?? '');
  const [latitude, setLatitude] = useState(
    initialValues?.latitude !== undefined ? String(initialValues.latitude) : '',
  );
  const [longitude, setLongitude] = useState(
    initialValues?.longitude !== undefined ? String(initialValues.longitude) : '',
  );
  const [phone, setPhone] = useState(initialValues?.phone ?? '');
  const [website, setWebsite] = useState(initialValues?.website ?? '');
  const [category, setCategory] = useState<VenueCategory>(initialValues?.category ?? 'bar');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submitBtnClass =
    accentColor === 'slate'
      ? 'flex items-center justify-center rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-600 dark:hover:bg-slate-500 dark:focus:ring-offset-zinc-900'
      : 'flex items-center justify-center rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:focus:ring-offset-zinc-900';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        name,
        address,
        city,
        state,
        zip,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        phone: phone || undefined,
        website: website || undefined,
        category,
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
        <label htmlFor="name" className={labelClass}>
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="The Happy Place"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="address" className={labelClass}>
          Address <span className="text-red-500">*</span>
        </label>
        <input
          id="address"
          type="text"
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Main St"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-6 gap-4">
        <div className="col-span-3">
          <label htmlFor="city" className={labelClass}>
            City <span className="text-red-500">*</span>
          </label>
          <input
            id="city"
            type="text"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="San Francisco"
            className={inputClass}
          />
        </div>
        <div className="col-span-1">
          <label htmlFor="state" className={labelClass}>
            State <span className="text-red-500">*</span>
          </label>
          <input
            id="state"
            type="text"
            required
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="CA"
            className={inputClass}
          />
        </div>
        <div className="col-span-2">
          <label htmlFor="zip" className={labelClass}>
            ZIP <span className="text-red-500">*</span>
          </label>
          <input
            id="zip"
            type="text"
            required
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="94103"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="latitude" className={labelClass}>
            Latitude <span className="text-red-500">*</span>
          </label>
          <input
            id="latitude"
            type="number"
            step="any"
            required
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="37.7749"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="longitude" className={labelClass}>
            Longitude <span className="text-red-500">*</span>
          </label>
          <input
            id="longitude"
            type="number"
            step="any"
            required
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="-122.4194"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="phone" className={labelClass}>
          Phone
        </label>
        <input
          id="phone"
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 123-4567"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="website" className={labelClass}>
          Website
        </label>
        <input
          id="website"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://example.com"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="category" className={labelClass}>
          Category <span className="text-red-500">*</span>
        </label>
        <select
          id="category"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value as VenueCategory)}
          className={inputClass}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
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
