import type {
  AuthTokens,
  CreateDealInput,
  CreateVenueInput,
  DealType,
  DealWithVenue,
  HappyHourDeal,
  PaginatedResponse,
  Venue,
  VenueCategory,
  VenueWithDistance,
} from '@api-types';

// ── Owner Profile ──

export interface OwnerProfile {
  id: string;
  email: string;
  business_name: string;
  contact_name: string;
  phone: string | null;
  is_verified: boolean;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (typeof window !== 'undefined') {
    const token = path.startsWith('/owners/')
      ? localStorage.getItem('owner_access_token')
      : localStorage.getItem('access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      body?.message ?? body?.error ?? `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ── Helpers ──

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string | number] => entry[1] !== undefined,
  );
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(
    entries.map(([k, v]) => [k, String(v)]),
  ).toString();
}

// ── Deals ──

export function getNearbyDeals(
  lat: number,
  lng: number,
  radius?: number,
  day?: number,
  time?: string,
  dealType?: DealType,
  page?: number,
  limit?: number,
): Promise<PaginatedResponse<DealWithVenue>> {
  return apiFetch(
    `/deals/nearby${qs({ lat, lng, radius, day, time, deal_type: dealType, page, limit })}`,
  );
}

export async function getHappeningNow(
  lat: number,
  lng: number,
): Promise<DealWithVenue[]> {
  const res = await apiFetch<{ data: DealWithVenue[] }>(`/deals/happening-now${qs({ lat, lng })}`);
  return res.data;
}

// ── Venues ──

export function getVenue(
  id: string,
): Promise<Venue & { deals: DealWithVenue[]; is_favorited?: boolean }> {
  return apiFetch(`/venues/${id}`);
}

// ── Search ──

export function searchVenues(
  q: string,
  lat?: number,
  lng?: number,
  category?: VenueCategory,
  radius?: number,
): Promise<PaginatedResponse<VenueWithDistance>> {
  return apiFetch(
    `/search/venues${qs({ q, lat, lng, category, radius })}`,
  );
}

export function searchDeals(
  q: string,
  lat?: number,
  lng?: number,
  day?: number,
  time?: string,
  dealType?: DealType,
): Promise<PaginatedResponse<DealWithVenue>> {
  return apiFetch(
    `/search/deals${qs({ q, lat, lng, day, time, deal_type: dealType })}`,
  );
}

// ── Auth ──

export function login(
  email: string,
  password: string,
): Promise<AuthTokens> {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function register(
  email: string,
  password: string,
  displayName?: string,
): Promise<AuthTokens> {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, display_name: displayName }),
  });
}

export function refreshToken(
  refreshToken: string,
): Promise<AuthTokens> {
  return apiFetch('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

// ── Favorites ──

export async function getFavorites(): Promise<VenueWithDistance[]> {
  const res = await apiFetch<{ data: VenueWithDistance[] }>('/users/me/favorites');
  return res.data;
}

export function addFavorite(venueId: string): Promise<void> {
  return apiFetch(`/users/me/favorites/${venueId}`, {
    method: 'POST',
  });
}

export function removeFavorite(venueId: string): Promise<void> {
  return apiFetch(`/users/me/favorites/${venueId}`, {
    method: 'DELETE',
  });
}

// ── Owners ──

export async function ownerLogin(email: string, password: string): Promise<{ tokens: AuthTokens; owner: OwnerProfile }> {
  return apiFetch('/owners/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function ownerRegister(input: {
  email: string;
  password: string;
  business_name: string;
  contact_name: string;
  phone?: string;
}): Promise<{ tokens: AuthTokens; owner: OwnerProfile }> {
  return apiFetch('/owners/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getOwnerVenues(): Promise<Venue[]> {
  return apiFetch('/owners/me/venues');
}

export function createOwnerVenue(input: CreateVenueInput): Promise<Venue> {
  return apiFetch('/owners/me/venues', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateOwnerVenue(id: string, input: Partial<CreateVenueInput>): Promise<Venue> {
  return apiFetch(`/owners/me/venues/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function createOwnerDeal(venueId: string, input: CreateDealInput): Promise<HappyHourDeal> {
  return apiFetch(`/owners/me/venues/${venueId}/deals`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateOwnerDeal(dealId: string, input: Partial<CreateDealInput>): Promise<HappyHourDeal> {
  return apiFetch(`/owners/me/deals/${dealId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteOwnerDeal(dealId: string): Promise<void> {
  return apiFetch(`/owners/me/deals/${dealId}`, {
    method: 'DELETE',
  });
}
