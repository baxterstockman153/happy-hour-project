'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth-context';
import {
  adminGetOwners,
  adminVerifyOwner,
  adminSuspendOwner,
  searchVenues,
  adminDeleteVenue,
  type OwnerProfile,
} from '@/lib/api';
import type { VenueWithDistance } from '@api-types';
import Spinner from '@/components/ui/Spinner';
import ErrorBanner from '@/components/ui/ErrorBanner';
import StatusBadge from '@/components/ui/StatusBadge';
import CategoryBadge from '@/components/ui/CategoryBadge';

type Tab = 'owners' | 'venues';

function DashboardContent() {
  const { admin, loading } = useAdminAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) ?? 'owners';

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // ── Owners tab state ──
  const [ownerFilter, setOwnerFilter] = useState<string | undefined>(undefined);
  const [owners, setOwners] = useState<OwnerProfile[]>([]);
  const [ownersLoading, setOwnersLoading] = useState(true);
  const [ownersError, setOwnersError] = useState<string | null>(null);

  // ── Venues tab state ──
  const [venues, setVenues] = useState<VenueWithDistance[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [venuesError, setVenuesError] = useState<string | null>(null);
  const [deletingVenueId, setDeletingVenueId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !admin) {
      router.push('/hh-admin/login');
    }
  }, [loading, admin, router]);

  useEffect(() => {
    if (!admin) return;
    fetchOwners();
  }, [admin, ownerFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!admin) return;
    fetchVenues();
  }, [admin]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchOwners() {
    setOwnersLoading(true);
    setOwnersError(null);
    try {
      const data = await adminGetOwners(ownerFilter);
      setOwners(data);
    } catch (err: unknown) {
      setOwnersError(err instanceof Error ? err.message : 'Failed to load owners.');
    } finally {
      setOwnersLoading(false);
    }
  }

  async function fetchVenues() {
    setVenuesLoading(true);
    setVenuesError(null);
    try {
      const res = await searchVenues('');
      setVenues(res.data);
    } catch (err: unknown) {
      setVenuesError(err instanceof Error ? err.message : 'Failed to load venues.');
    } finally {
      setVenuesLoading(false);
    }
  }

  async function handleVerify(id: string) {
    const prev = owners;
    setOwners((os) =>
      os.map((o) => (o.id === id ? { ...o, is_verified: true, is_suspended: false } : o)),
    );
    try {
      const updated = await adminVerifyOwner(id);
      setOwners((os) => os.map((o) => (o.id === id ? updated : o)));
    } catch {
      setOwners(prev);
    }
  }

  async function handleSuspend(id: string) {
    const prev = owners;
    setOwners((os) =>
      os.map((o) => (o.id === id ? { ...o, is_suspended: true } : o)),
    );
    try {
      const updated = await adminSuspendOwner(id);
      setOwners((os) => os.map((o) => (o.id === id ? updated : o)));
    } catch {
      setOwners(prev);
    }
  }

  async function handleDeleteVenue(id: string) {
    setDeletingVenueId(id);
    try {
      await adminDeleteVenue(id);
      setVenues((vs) => vs.filter((v) => v.id !== id));
    } catch (err: unknown) {
      setVenuesError(err instanceof Error ? err.message : 'Failed to delete venue.');
    } finally {
      setDeletingVenueId(null);
    }
  }

  if (loading || !admin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-5 w-5 text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
        Admin Dashboard
      </h1>

      {/* Tabs */}
      <div className="mb-6 border-b border-zinc-200 dark:border-zinc-800">
        <nav className="-mb-px flex gap-6">
          {(['owners', 'venues'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 pb-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'border-slate-700 text-slate-700 dark:border-slate-400 dark:text-slate-300'
                  : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Owners Tab ── */}
      {activeTab === 'owners' && (
        <div>
          {/* Filter buttons */}
          <div className="mb-4 flex gap-2">
            {[
              { label: 'All', value: undefined },
              { label: 'Pending', value: 'pending' },
              { label: 'Suspended', value: 'suspended' },
            ].map(({ label, value }) => (
              <button
                key={label}
                onClick={() => setOwnerFilter(value)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  ownerFilter === value
                    ? 'border-slate-700 bg-slate-700 text-white dark:border-slate-500 dark:bg-slate-600'
                    : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {ownersError && <div className="mb-4"><ErrorBanner message={ownersError} /></div>}

          {ownersLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner className="h-5 w-5 text-zinc-400" />
            </div>
          ) : owners.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500">No owners found.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                <thead className="bg-zinc-50 dark:bg-zinc-900">
                  <tr>
                    {['Email', 'Business', 'Contact', 'Status', 'Actions'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                  {owners.map((owner) => (
                    <tr key={owner.id}>
                      <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                        {owner.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                        {owner.business_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                        {owner.contact_name}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          isVerified={owner.is_verified}
                          isSuspended={owner.is_suspended}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {!owner.is_verified && !owner.is_suspended && (
                            <button
                              onClick={() => handleVerify(owner.id)}
                              className="rounded-md bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-600"
                            >
                              Verify
                            </button>
                          )}
                          {!owner.is_suspended && (
                            <button
                              onClick={() => handleSuspend(owner.id)}
                              className="rounded-md bg-red-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-red-600"
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Venues Tab ── */}
      {activeTab === 'venues' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-zinc-500">{venues.length} venues</span>
            <Link
              href="/hh-admin/venues/new"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Add Venue
            </Link>
          </div>

          {venuesError && <div className="mb-4"><ErrorBanner message={venuesError} /></div>}

          {venuesLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner className="h-5 w-5 text-zinc-400" />
            </div>
          ) : venues.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500">No venues found.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                <thead className="bg-zinc-50 dark:bg-zinc-900">
                  <tr>
                    {['Name', 'City', 'Category', 'Actions'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                  {venues.map((venue) => (
                    <tr key={venue.id}>
                      <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {venue.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                        {venue.city}
                      </td>
                      <td className="px-4 py-3">
                        <CategoryBadge category={venue.category} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/hh-admin/venues/detail?id=${venue.id}`}
                            className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          >
                            Manage
                          </Link>
                          <Link
                            href={`/hh-admin/venues/edit?id=${venue.id}`}
                            className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          >
                            Edit
                          </Link>
                          {deletingVenueId === venue.id ? (
                            <span className="text-xs text-zinc-400">Deleting...</span>
                          ) : (
                            <button
                              onClick={() => {
                                if (confirm(`Delete "${venue.name}"?`)) {
                                  handleDeleteVenue(venue.id);
                                }
                              }}
                              className="rounded-md bg-red-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-red-600"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
