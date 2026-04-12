'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth-context';

export default function AdminNav() {
  const { admin, logout, loading } = useAdminAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/hh-admin/login');
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/hh-admin/dashboard"
          className="text-xl font-bold tracking-tight text-slate-700 transition-colors hover:text-slate-900"
        >
          Happy Hour{' '}
          <span className="text-sm font-medium text-zinc-400">Admin Portal</span>
        </Link>

        <div className="flex items-center gap-6">
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-zinc-100" />
          ) : admin ? (
            <div className="flex items-center gap-4">
              <span className="hidden text-sm text-zinc-500 sm:inline">{admin.email}</span>
              <button
                onClick={handleLogout}
                className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/hh-admin/login"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-slate-700"
            >
              Login
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
