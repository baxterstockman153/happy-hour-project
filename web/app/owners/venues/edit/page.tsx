'use client';

import { Suspense } from 'react';
import EditVenueForm from './edit-form';

export default function EditVenuePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center">
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      }
    >
      <EditVenueForm />
    </Suspense>
  );
}
