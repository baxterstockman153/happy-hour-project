'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOwnerAuth } from '@/lib/owner-auth-context';
import { getVenue, updateOwnerVenue } from '@/lib/api';
import type { VenueCategory } from '@api-types';

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

const labelClass =
  'block text-sm font-medium text-zinc-700 dark:text-zinc-300';

export default function EditVenueForm() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { owner, loading: authLoading } = useOwnerAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [category, setCategory] = useState<VenueCategory>('bar');

  const [loadingVenue, setLoadingVenue] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !owner) {
      router.replace('/owners/login');
    }
  }, [authLoading, owner, router]);

  useEffect(() => {
    if (!id) return;

    async function fetchVenue() {
      try {
        const venue = await getVenue(id!);
        setName(venue.name);
        setAddress(venue.address);
        setCity(venue.city);
        setState(venue.state);
        setZip(venue.zip);
        setLatitude(String(venue.latitude));
        setLongitude(String(venue.longitude));
        setPhone(venue.phone ?? '');
        setWebsite(venue.website ?? '');
        setCategory(venue.category);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load venue.';
        setError(message);
      } finally {
        setLoadingVenue(false);
      }
    }

    fetchVenue();
  }, [id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSubmitting(true);

    try {
      await updateOwnerVenue(id, {
        name, address, city, state, zip,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        phone: phone || undefined,
        website: website || undefined,
        category,
      });
      router.push('/owners/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update venue.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !owner) {
    return <div className="flex min-h-full items-center justify-center"><p className="text-sm text-zinc-500">Loading...</p></div>;
  }

  if (!id) {
    return <div className="flex min-h-full items-center justify-center"><p className="text-sm text-red-500">Missing venue ID.</p></div>;
  }

  if (loadingVenue) {
    return <div className="flex min-h-full items-center justify-center"><p className="text-sm text-zinc-500">Loading venue...</p></div>;
  }

  return (
    <div className="flex min-h-full flex-1 items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Edit Venue</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Update the details for your venue.</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">{error}</div>
            )}

            <div><label htmlFor="name" className={labelClass}>Name <span className="text-red-500">*</span></label><input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="The Happy Place" className={inputClass} /></div>
            <div><label htmlFor="address" className={labelClass}>Address <span className="text-red-500">*</span></label><input id="address" type="text" required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" className={inputClass} /></div>

            <div className="grid grid-cols-6 gap-4">
              <div className="col-span-3"><label htmlFor="city" className={labelClass}>City <span className="text-red-500">*</span></label><input id="city" type="text" required value={city} onChange={(e) => setCity(e.target.value)} placeholder="San Francisco" className={inputClass} /></div>
              <div className="col-span-1"><label htmlFor="state" className={labelClass}>State <span className="text-red-500">*</span></label><input id="state" type="text" required value={state} onChange={(e) => setState(e.target.value)} placeholder="CA" className={inputClass} /></div>
              <div className="col-span-2"><label htmlFor="zip" className={labelClass}>ZIP <span className="text-red-500">*</span></label><input id="zip" type="text" required value={zip} onChange={(e) => setZip(e.target.value)} placeholder="94103" className={inputClass} /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><label htmlFor="latitude" className={labelClass}>Latitude <span className="text-red-500">*</span></label><input id="latitude" type="number" step="any" required value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="37.7749" className={inputClass} /></div>
              <div><label htmlFor="longitude" className={labelClass}>Longitude <span className="text-red-500">*</span></label><input id="longitude" type="number" step="any" required value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="-122.4194" className={inputClass} /></div>
            </div>

            <div><label htmlFor="phone" className={labelClass}>Phone</label><input id="phone" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" className={inputClass} /></div>
            <div><label htmlFor="website" className={labelClass}>Website</label><input id="website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" className={inputClass} /></div>

            <div><label htmlFor="category" className={labelClass}>Category <span className="text-red-500">*</span></label>
              <select id="category" required value={category} onChange={(e) => setCategory(e.target.value as VenueCategory)} className={inputClass}>
                {CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={() => router.push('/owners/dashboard')} className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">Cancel</button>
              <button type="submit" disabled={submitting} className="flex items-center justify-center rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:focus:ring-offset-zinc-900">
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
