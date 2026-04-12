'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { getVenue, adminDeleteDeal, adminCreateDeal } from '@/lib/api';
import type { DealWithVenue, VenueCategory } from '@api-types';
import Spinner from '@/components/ui/Spinner';
import ErrorBanner from '@/components/ui/ErrorBanner';
import CategoryBadge from '@/components/ui/CategoryBadge';
import DealForm, { type DealFormData } from '@/components/forms/DealForm';

interface VenueDetail {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  category: VenueCategory;
  deals: DealWithVenue[];
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function VenueDetailContent() {
  const { admin, loading } = useAdminAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [venue, setVenue] = useState<VenueDetail | null>(null);
  const [loadingVenue, setLoadingVenue] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [deletingDealId, setDeletingDealId] = useState<string | null>(null);
  const [dealError, setDealError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !admin) {
      router.push('/hh-admin/login');
    }
  }, [loading, admin, router]);

  useEffect(() => {
    if (!id) return;

    async function fetchVenue() {
      try {
        const data = await getVenue(id!);
        setVenue(data as VenueDetail);
      } catch (err: unknown) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load venue.');
      } finally {
        setLoadingVenue(false);
      }
    }

    fetchVenue();
  }, [id]);

  async function handleDeleteDeal(dealId: string) {
    setDeletingDealId(dealId);
    setDealError(null);
    try {
      await adminDeleteDeal(dealId);
      setVenue((v) =>
        v ? { ...v, deals: v.deals.filter((d) => d.id !== dealId) } : v,
      );
    } catch (err: unknown) {
      setDealError(err instanceof Error ? err.message : 'Failed to delete deal.');
    } finally {
      setDeletingDealId(null);
    }
  }

  async function handleAddDeal(data: DealFormData) {
    const newDeal = await adminCreateDeal(id!, {
      description: data.description,
      deal_type: data.dealType,
      day_of_week: data.daysOfWeek,
      start_time: data.startTime,
      end_time: data.endTime,
      is_active: data.isActive,
    });
    setVenue((v) =>
      v ? { ...v, deals: [...v.deals, newDeal as unknown as DealWithVenue] } : v,
    );
    setShowAddDeal(false);
  }

  if (loading || !admin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-5 w-5 text-zinc-400" />
      </div>
    );
  }

  if (!id) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <ErrorBanner message="Missing venue ID." />
      </div>
    );
  }

  if (loadingVenue) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-5 w-5 text-zinc-400" />
      </div>
    );
  }

  if (loadError || !venue) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <ErrorBanner message={loadError ?? 'Venue not found.'} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Venue header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2">
              <CategoryBadge category={venue.category} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
              {venue.name}
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {venue.address}, {venue.city}, {venue.state} {venue.zip}
            </p>
          </div>
          <Link
            href={`/hh-admin/venues/edit?id=${id}`}
            className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            Edit Venue
          </Link>
        </div>
      </div>

      {/* Deals section */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Happy Hour Deals
        </h2>

        {dealError && <div className="mb-4"><ErrorBanner message={dealError} /></div>}

        {venue.deals.length === 0 && !showAddDeal && (
          <p className="mb-4 text-sm text-zinc-500">No deals yet.</p>
        )}

        {venue.deals.length > 0 && (
          <div className="mb-6 space-y-3">
            {venue.deals.map((deal) => (
              <div
                key={deal.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-block rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium capitalize text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {deal.deal_type}
                      </span>
                      {!deal.is_active && (
                        <span className="inline-block rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{deal.description}</p>
                    <p className="text-xs text-zinc-500">
                      {deal.day_of_week.map((d) => DAY_NAMES[d]).join(', ')} &middot;{' '}
                      {deal.start_time} – {deal.end_time}
                    </p>
                  </div>
                  {deletingDealId === deal.id ? (
                    <Spinner className="h-4 w-4 shrink-0 text-zinc-400" />
                  ) : (
                    <button
                      onClick={() => {
                        if (confirm('Delete this deal?')) {
                          handleDeleteDeal(deal.id);
                        }
                      }}
                      className="shrink-0 rounded-md bg-red-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-red-600"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {showAddDeal ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Add Deal
            </h3>
            <DealForm
              submitLabel="Add Deal"
              accentColor="slate"
              onCancel={() => setShowAddDeal(false)}
              onSubmit={handleAddDeal}
            />
          </div>
        ) : (
          <button
            onClick={() => setShowAddDeal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Add Deal
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminVenueDetailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" /></div>}>
      <VenueDetailContent />
    </Suspense>
  );
}
