'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { getVenue, adminUpdateVenue } from '@/lib/api';
import VenueForm, { type VenueFormData } from '@/components/forms/VenueForm';
import Spinner from '@/components/ui/Spinner';
import ErrorBanner from '@/components/ui/ErrorBanner';

function EditVenueContent() {
  const { admin, loading } = useAdminAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [initialValues, setInitialValues] = useState<Partial<VenueFormData> | null>(null);
  const [loadingVenue, setLoadingVenue] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !admin) {
      router.push('/hh-admin/login');
    }
  }, [loading, admin, router]);

  useEffect(() => {
    if (!id) return;

    async function fetchVenue() {
      try {
        const venue = await getVenue(id!);
        setInitialValues({
          name: venue.name,
          address: venue.address,
          city: venue.city,
          state: venue.state,
          zip: venue.zip,
          latitude: venue.latitude,
          longitude: venue.longitude,
          phone: venue.phone ?? '',
          website: venue.website ?? '',
          category: venue.category,
        });
      } catch (err: unknown) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load venue.');
      } finally {
        setLoadingVenue(false);
      }
    }

    fetchVenue();
  }, [id]);

  if (loading || !admin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-5 w-5 text-zinc-400" />
      </div>
    );
  }

  if (!id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
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

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <ErrorBanner message={loadError} />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Edit Venue
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Update venue details.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <VenueForm
            initialValues={initialValues ?? undefined}
            submitLabel="Save Changes"
            accentColor="slate"
            onCancel={() => router.push(`/hh-admin/venues/detail?id=${id}`)}
            onSubmit={async (data: VenueFormData) => {
              await adminUpdateVenue(id, data);
              router.push(`/hh-admin/venues/detail?id=${id}`);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function AdminEditVenuePage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" /></div>}>
      <EditVenueContent />
    </Suspense>
  );
}
