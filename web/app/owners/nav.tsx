'use client';

import Link from 'next/link';
import { useOwnerAuth } from '@/lib/owner-auth-context';

export default function OwnerNav() {
  const { owner, logout, loading } = useOwnerAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-indigo-100 bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link
          href="/owners/dashboard"
          className="text-xl font-bold tracking-tight text-indigo-600 transition-colors hover:text-indigo-700"
        >
          Happy Hour{' '}
          <span className="text-sm font-medium text-zinc-400">Owner Portal</span>
        </Link>

        {/* Auth section */}
        <div className="flex items-center gap-6">
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-zinc-100" />
          ) : owner ? (
            <div className="flex items-center gap-4">
              <span className="hidden text-sm text-zinc-500 sm:inline">
                {owner.business_name || owner.email}
              </span>
              <button
                onClick={logout}
                className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/owners/login"
                className="text-sm font-medium text-zinc-600 transition-colors hover:text-indigo-600"
              >
                Login
              </Link>
              <Link
                href="/owners/register"
                className="rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
