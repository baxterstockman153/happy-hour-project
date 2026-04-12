'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOwnerAuth } from '@/lib/owner-auth-context';
import { createOwnerDeal } from '@/lib/api';
import DealForm, { type DealFormData } from '@/components/forms/DealForm';
import Spinner from '@/components/ui/Spinner';

export default function NewDealForm() {
  const searchParams = useSearchParams();
  const venueId = searchParams.get('venueId');
  const { owner, loading: authLoading } = useOwnerAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !owner) {
      router.replace('/owners/login');
    }
  }, [authLoading, owner, router]);

  if (authLoading || !owner) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Spinner className="h-5 w-5 text-zinc-400" />
      </div>
    );
  }

  if (!venueId) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <p className="text-sm text-red-500">Missing venue ID.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Add New Deal
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Create a happy hour deal for your venue.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <DealForm
            submitLabel="Create Deal"
            accentColor="indigo"
            onCancel={() => router.push('/owners/dashboard')}
            onSubmit={async (data: DealFormData) => {
              await createOwnerDeal(venueId, {
                description: data.description,
                deal_type: data.dealType,
                day_of_week: data.daysOfWeek,
                start_time: data.startTime,
                end_time: data.endTime,
                is_active: data.isActive,
              });
              router.push('/owners/dashboard');
            }}
          />
        </div>
      </div>
    </div>
  );
}
