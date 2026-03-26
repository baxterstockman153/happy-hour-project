// ── Venue ──

export type VenueCategory = 'bar' | 'restaurant' | 'brewery' | 'lounge' | 'pub' | 'winery' | 'other';

export interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  website: string | null;
  image_url: string | null;
  category: VenueCategory;
  created_at: Date;
  updated_at: Date;
}

export interface VenueWithDistance extends Venue {
  distance_miles: number;
  is_favorited?: boolean;
}

export interface CreateVenueInput {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  image_url?: string;
  category: VenueCategory;
}

export interface UpdateVenueInput extends Partial<CreateVenueInput> {}

// ── Deal ──

export type DealType = 'drinks' | 'food' | 'both';

export interface HappyHourDeal {
  id: string;
  venue_id: string;
  day_of_week: number[]; // 0=Sunday, 6=Saturday
  start_time: string;    // "HH:MM" 24-hour format
  end_time: string;      // "HH:MM" 24-hour format
  description: string;
  deal_type: DealType;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DealWithVenue extends HappyHourDeal {
  venue: VenueWithDistance;
}

export interface CreateDealInput {
  day_of_week: number[];
  start_time: string;
  end_time: string;
  description: string;
  deal_type: DealType;
  is_active?: boolean;
}

export interface UpdateDealInput extends Partial<CreateDealInput> {}

// ── User ──

export interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  created_at: Date;
}

export interface AdminUser {
  id: string;
  email: string;
  password_hash: string;
  role: 'super_admin' | 'editor';
  created_at: Date;
}

export interface UserFavorite {
  user_id: string;
  venue_id: string;
  created_at: Date;
}

// ── Venue Owner ──

export interface VenueOwner {
  id: string;
  email: string;
  password_hash: string;
  business_name: string;
  contact_name: string;
  phone: string | null;
  is_verified: boolean;
  is_suspended: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface VenueOwnerProfile {
  id: string;
  email: string;
  business_name: string;
  contact_name: string;
  phone: string | null;
  is_verified: boolean;
  is_suspended: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateVenueOwnerInput {
  email: string;
  password: string;
  business_name: string;
  contact_name: string;
  phone?: string;
}

// ── Auth ──

export interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
  type: 'access' | 'refresh';
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  display_name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

// ── API ──

export interface NearbyQuery {
  lat: number;
  lng: number;
  radius?: number;  // miles, default 5
  day?: number;
  time?: string;    // "HH:MM"
  deal_type?: DealType;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
