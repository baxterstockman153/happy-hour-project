'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function Nav() {
  const { user, logout, loading } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-amber-100 bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-amber-600 transition-colors hover:text-amber-700"
        >
          Happy Hour
        </Link>

        {/* Navigation links */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-600 transition-colors hover:text-amber-600"
          >
            Deals
          </Link>
          <Link
            href="/owners/dashboard"
            className="text-sm font-medium text-zinc-600 transition-colors hover:text-amber-600"
          >
            Owner Portal
          </Link>

          {/* Auth section */}
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-zinc-100" />
          ) : user ? (
            <div className="flex items-center gap-4">
              <span className="hidden text-sm text-zinc-500 sm:inline">
                {user.email}
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
                href="/login"
                className="text-sm font-medium text-zinc-600 transition-colors hover:text-amber-600"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-600"
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
