'use client';

import { Suspense } from 'react';
import NewDealForm from './deal-form';

export default function NewDealPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center">
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      }
    >
      <NewDealForm />
    </Suspense>
  );
}
