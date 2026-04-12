import type { ReactNode } from 'react';
import AdminProviders from './providers';
import AdminNav from './nav';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminProviders>
      <AdminNav />
      {children}
    </AdminProviders>
  );
}
