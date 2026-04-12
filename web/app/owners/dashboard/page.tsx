'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOwnerAuth } from '@/lib/owner-auth-context';
import { getOwnerVenues } from '@/lib/api';
import type { Venue } from '@api-types';
import Spinner from '@/components/ui/Spinner';
import ErrorBanner from '@/components/ui/ErrorBanner';
import EmptyState from '@/components/ui/EmptyState';
import CategoryBadge from '@/components/ui/CategoryBadge';

export default function OwnerDashboardPage() {
  const { owner, loading } = useOwnerAuth();
  const router = useRouter();

  const [venues, setVenues] = useState<Venue[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !owner) {
      router.push('/owners/login');
    }
  }, [loading, owner, router]);

  useEffect(() => {
    if (!owner) return;

    async function fetchVenues() {
      setFetchLoading(true);
      setError(null);

      try {
        const data = await getOwnerVenues();
        setVenues(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load venues';
        setError(message);
      } finally {
        setFetchLoading(false);
      }
    }

    fetchVenues();
  }, [owner]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-500">
          <Spinner className="h-5 w-5" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (!owner) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Verification banner */}
      {!owner.is_verified && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 flex-shrink-0 text-amber-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.345 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Your account is pending verification. You can still add venues and deals.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          Your Venues
        </h1>
        <Link
          href="/owners/venues/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:focus:ring-offset-zinc-900"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Add Venue
        </Link>
      </div>

      {/* Error state */}
      {error && <div className="mb-6"><ErrorBanner message={error} /></div>}

      {/* Loading state */}
      {fetchLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-zinc-500">
            <Spinner className="h-5 w-5" />
            <span className="text-sm">Loading your venues...</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!fetchLoading && !error && venues.length === 0 && (
        <EmptyState
          icon={
            <svg
              className="h-12 w-12 text-zinc-400 dark:text-zinc-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016A3.001 3.001 0 0021 9.349m-18 0V6a.75.75 0 01.75-.75h16.5a.75.75 0 01.75.75v3.349"
              />
            </svg>
          }
          title="No venues yet"
          description="Get started by adding your first venue to manage happy hour deals."
          action={
            <Link
              href="/owners/venues/new"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:focus:ring-offset-zinc-900"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Add Your First Venue
            </Link>
          }
        />
      )}

      {/* Venue cards grid */}
      {!fetchLoading && venues.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => (
            <div
              key={venue.id}
              className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              {venue.image_url && (
                <div className="mb-4 overflow-hidden rounded-xl">
                  <img
                    src={venue.image_url}
                    alt={venue.name}
                    className="h-36 w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
              )}

              <CategoryBadge category={venue.category} />

              <h2 className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {venue.name}
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{venue.address}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {venue.city}, {venue.state} {venue.zip}
              </p>

              <div className="mt-4 flex items-center gap-3">
                <Link
                  href={`/owners/venues/edit?id=${venue.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-indigo-400"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                  </svg>
                  Edit Venue
                </Link>
                <Link
                  href={`/owners/deals/new?venueId=${venue.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                  </svg>
                  Add Deal
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
