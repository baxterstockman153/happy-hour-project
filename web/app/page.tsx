'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getHappeningNow, getNearbyDeals, addFavorite, removeFavorite } from '@/lib/api';
import type { DealWithVenue, DealType } from '@api-types';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${ampm}`;
}

function dealTypeBadge(type: DealType) {
  const styles: Record<DealType, string> = {
    drinks: 'bg-blue-100 text-blue-700',
    food: 'bg-green-100 text-green-700',
    both: 'bg-purple-100 text-purple-700',
  };
  const labels: Record<DealType, string> = {
    drinks: 'Drinks',
    food: 'Food',
    both: 'Food & Drinks',
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[type]}`}>
      {labels[type]}
    </span>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5 text-red-500"
    >
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5 text-zinc-400 transition-colors hover:text-red-400"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  );
}

function DealCard({
  deal,
  isLoggedIn,
  onToggleFavorite,
}: {
  deal: DealWithVenue;
  isLoggedIn: boolean;
  onToggleFavorite: (deal: DealWithVenue) => void;
}) {
  const days = deal.day_of_week.map((d) => DAY_NAMES[d]).join(', ');

  return (
    <div className="group relative rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Header row */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-zinc-900">
            {deal.venue.name}
          </h3>
          {deal.venue.distance_miles != null && (
            <p className="mt-0.5 text-sm text-zinc-500">
              {deal.venue.distance_miles.toFixed(1)} mi away
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {dealTypeBadge(deal.deal_type)}
          {isLoggedIn && (
            <button
              onClick={() => onToggleFavorite(deal)}
              className="rounded-full p-1 transition-colors hover:bg-zinc-100"
              aria-label={
                deal.venue.is_favorited ? 'Remove from favorites' : 'Add to favorites'
              }
            >
              <HeartIcon filled={!!deal.venue.is_favorited} />
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="mb-3 text-sm leading-relaxed text-zinc-700">{deal.description}</p>

      {/* Footer details */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-3.5 w-3.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {formatTime(deal.start_time)} &ndash; {formatTime(deal.end_time)}
        </span>
        <span className="flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-3.5 w-3.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
            />
          </svg>
          {days}
        </span>
      </div>
    </div>
  );
}

const DEAL_TYPE_OPTIONS: { value: DealType | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'drinks', label: 'Drinks' },
  { value: 'food', label: 'Food' },
  { value: 'both', label: 'Food & Drinks' },
];

const RADIUS_OPTIONS = [
  { value: 1, label: '1 mi' },
  { value: 2, label: '2 mi' },
  { value: 5, label: '5 mi' },
  { value: 10, label: '10 mi' },
];

function FiltersBar({
  dealType,
  onDealTypeChange,
  selectedDay,
  onDayChange,
  radius,
  onRadiusChange,
  todayIndex,
}: {
  dealType: DealType | undefined;
  onDealTypeChange: (v: DealType | undefined) => void;
  selectedDay: number | undefined;
  onDayChange: (v: number | undefined) => void;
  radius: number;
  onRadiusChange: (v: number) => void;
  todayIndex: number;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5">
        {/* Deal Type */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Deal Type
          </p>
          <div className="flex flex-wrap gap-2">
            {DEAL_TYPE_OPTIONS.map((opt) => {
              const active = dealType === opt.value;
              return (
                <button
                  key={opt.label}
                  onClick={() => onDealTypeChange(opt.value)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day of Week */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Day
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onDayChange(undefined)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedDay === undefined
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              Any
            </button>
            {DAY_SHORT.map((name, idx) => {
              const active = selectedDay === idx;
              const isToday = idx === todayIndex;
              return (
                <button
                  key={idx}
                  onClick={() => onDayChange(idx)}
                  className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {name}
                  {isToday && !active && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-400 ring-1 ring-white" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Distance */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Distance
          </p>
          <div className="flex flex-wrap gap-2">
            {RADIUS_OPTIONS.map((opt) => {
              const active = radius === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => onRadiusChange(opt.value)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [happeningNow, setHappeningNow] = useState<DealWithVenue[]>([]);
  const [nearbyDeals, setNearbyDeals] = useState<DealWithVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const todayIndex = new Date().getDay();
  const [dealType, setDealType] = useState<DealType | undefined>(undefined);
  const [selectedDay, setSelectedDay] = useState<number | undefined>(undefined);
  const [radius, setRadius] = useState<number>(5);

  // Request geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError(
        'Geolocation is not supported by your browser. Please use a modern browser to see nearby deals.'
      );
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        let message = 'Unable to get your location.';
        if (error.code === error.PERMISSION_DENIED) {
          message =
            'Location access was denied. Please enable location permissions in your browser settings to see deals near you.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = 'Location information is unavailable. Please try again later.';
        } else if (error.code === error.TIMEOUT) {
          message = 'Location request timed out. Please try again.';
        }
        setLocationError(message);
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  // Initial fetch once coords are available
  useEffect(() => {
    if (!coords) return;

    async function fetchInitial() {
      setLoading(true);
      try {
        const [nowData, nearbyData] = await Promise.all([
          getHappeningNow(coords!.lat, coords!.lng),
          getNearbyDeals(coords!.lat, coords!.lng, radius, selectedDay, undefined, dealType),
        ]);
        setHappeningNow(nowData);
        setNearbyDeals(nearbyData.data);
      } catch (err) {
        console.error('Failed to fetch deals:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords]);

  // Re-fetch nearby when filters change (coords must be set)
  useEffect(() => {
    if (!coords) return;

    async function fetchFiltered() {
      setNearbyLoading(true);
      try {
        const data = await getNearbyDeals(coords!.lat, coords!.lng, radius, selectedDay, undefined, dealType);
        setNearbyDeals(data.data);
      } catch (err) {
        console.error('Failed to fetch deals:', err);
      } finally {
        setNearbyLoading(false);
      }
    }

    fetchFiltered();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealType, selectedDay, radius]);

  const handleToggleFavorite = useCallback(
    async (deal: DealWithVenue) => {
      if (!deal.venue.id) return;

      const wasFavorited = deal.venue.is_favorited;

      const updateDeal = (d: DealWithVenue): DealWithVenue =>
        d.id === deal.id
          ? { ...d, venue: { ...d.venue, is_favorited: !wasFavorited } }
          : d;

      setHappeningNow((prev) => prev.map(updateDeal));
      setNearbyDeals((prev) => prev.map(updateDeal));

      try {
        if (wasFavorited) {
          await removeFavorite(deal.venue.id);
        } else {
          await addFavorite(deal.venue.id);
        }
      } catch (err) {
        console.error('Failed to toggle favorite:', err);
        const revertDeal = (d: DealWithVenue): DealWithVenue =>
          d.id === deal.id
            ? { ...d, venue: { ...d.venue, is_favorited: wasFavorited } }
            : d;
        setHappeningNow((prev) => prev.map(revertDeal));
        setNearbyDeals((prev) => prev.map(revertDeal));
      }
    },
    []
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
        <p className="text-sm text-zinc-500">
          {coords ? 'Finding deals near you...' : 'Getting your location...'}
        </p>
      </div>
    );
  }

  // Location error state
  if (locationError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-8 w-8 text-amber-600"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-zinc-900">Location Required</h2>
        <p className="max-w-md text-sm leading-relaxed text-zinc-600">{locationError}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Filters */}
      <section className="mb-8">
        <h1 className="mb-4 text-2xl font-bold text-zinc-900 sm:text-3xl">
          Find Happy Hour
        </h1>
        <FiltersBar
          dealType={dealType}
          onDealTypeChange={setDealType}
          selectedDay={selectedDay}
          onDayChange={setSelectedDay}
          radius={radius}
          onRadiusChange={setRadius}
          todayIndex={todayIndex}
        />
      </section>

      {/* Happening Now */}
      {happeningNow.length > 0 && (
        <section className="mb-10">
          <div className="mb-6 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 px-6 py-8 text-white shadow-lg sm:px-8 sm:py-10">
            <h2 className="mb-1 text-2xl font-bold sm:text-3xl">Happening Now</h2>
            <p className="text-amber-100">Deals that are live right now near you</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {happeningNow.map((deal) => (
              <div key={deal.id} className="relative">
                <div className="absolute -top-2 left-4 z-10 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
                  Live
                </div>
                <DealCard
                  deal={deal}
                  isLoggedIn={!!user}
                  onToggleFavorite={handleToggleFavorite}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Nearby Deals */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">
              {selectedDay !== undefined
                ? `${DAY_NAMES[selectedDay]} Deals`
                : 'Nearby Deals'}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {dealType
                ? `${dealType === 'both' ? 'Food & drinks' : dealType} specials within ${radius} mi`
                : `All happy hour specials within ${radius} mi`}
            </p>
          </div>
          {nearbyLoading && (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-200 border-t-amber-500" />
          )}
        </div>

        {nearbyDeals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center">
            <p className="text-zinc-500">No deals match your filters. Try adjusting them above.</p>
          </div>
        ) : (
          <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 transition-opacity ${nearbyLoading ? 'opacity-50' : 'opacity-100'}`}>
            {nearbyDeals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                isLoggedIn={!!user}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
