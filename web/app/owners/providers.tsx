'use client';

import { OwnerAuthProvider } from '@/lib/owner-auth-context';
import type { ReactNode } from 'react';

export default function OwnerProviders({ children }: { children: ReactNode }) {
  return <OwnerAuthProvider>{children}</OwnerAuthProvider>;
}
