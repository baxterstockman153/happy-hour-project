'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { adminCreateVenue } from '@/lib/api';
import VenueForm, { type VenueFormData } from '@/components/forms/VenueForm';
import Spinner from '@/components/ui/Spinner';

export default function AdminNewVenuePage() {
  const { admin, loading } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !admin) {
      router.push('/hh-admin/login');
    }
  }, [loading, admin, router]);

  if (loading || !admin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-5 w-5 text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Add Venue
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Create a new venue in the system.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <VenueForm
            submitLabel="Create Venue"
            accentColor="slate"
            onCancel={() => router.push('/hh-admin/dashboard?tab=venues')}
            onSubmit={async (data: VenueFormData) => {
              await adminCreateVenue(data);
              router.push('/hh-admin/dashboard?tab=venues');
            }}
          />
        </div>
      </div>
    </div>
  );
}
