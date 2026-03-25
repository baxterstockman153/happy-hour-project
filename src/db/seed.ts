import bcrypt from 'bcrypt';
import { query, closePool } from './connection';

const SALT_ROUNDS = 10;

interface SeedVenue {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
  image_url: string | null;
  category: string;
}

interface SeedDeal {
  venueIndex: number;
  day_of_week: number[];
  start_time: string;
  end_time: string;
  description: string;
  deal_type: string;
}

const venues: SeedVenue[] = [
  {
    name: 'Rainey Street Bar & Grill',
    address: '76 Rainey St',
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    lat: 30.2575,
    lng: -97.7396,
    phone: '512-555-0101',
    website: 'https://raineystreetbar.example.com',
    image_url: null,
    category: 'bar',
  },
  {
    name: 'South Congress Brewing Co.',
    address: '1201 S Congress Ave',
    city: 'Austin',
    state: 'TX',
    zip: '78704',
    lat: 30.2489,
    lng: -97.7488,
    phone: '512-555-0202',
    website: 'https://socobrewing.example.com',
    image_url: null,
    category: 'brewery',
  },
  {
    name: 'The Driskill Lounge',
    address: '604 Brazos St',
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    lat: 30.2672,
    lng: -97.7407,
    phone: '512-555-0303',
    website: 'https://driskilllounge.example.com',
    image_url: null,
    category: 'lounge',
  },
  {
    name: 'East 6th Pub',
    address: '512 E 6th St',
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    lat: 30.2676,
    lng: -97.7352,
    phone: '512-555-0404',
    website: null,
    image_url: null,
    category: 'pub',
  },
  {
    name: 'Barton Creek Winery',
    address: '3600 Barton Creek Blvd',
    city: 'Austin',
    state: 'TX',
    zip: '78735',
    lat: 30.2870,
    lng: -97.8120,
    phone: '512-555-0505',
    website: 'https://bartoncreekwinery.example.com',
    image_url: null,
    category: 'winery',
  },
  {
    name: 'Lamar Union Food Hall',
    address: '1100 S Lamar Blvd',
    city: 'Austin',
    state: 'TX',
    zip: '78704',
    lat: 30.2537,
    lng: -97.7631,
    phone: '512-555-0606',
    website: 'https://lamarunionfood.example.com',
    image_url: null,
    category: 'restaurant',
  },
  {
    name: 'Mueller Neighborhood Grill',
    address: '1900 Aldrich St',
    city: 'Austin',
    state: 'TX',
    zip: '78723',
    lat: 30.2964,
    lng: -97.7050,
    phone: '512-555-0707',
    website: null,
    image_url: null,
    category: 'restaurant',
  },
  {
    name: 'Domain Craft House',
    address: '11601 Domain Dr',
    city: 'Austin',
    state: 'TX',
    zip: '78758',
    lat: 30.4022,
    lng: -97.7252,
    phone: '512-555-0808',
    website: 'https://domaincrafthouse.example.com',
    image_url: null,
    category: 'bar',
  },
];

const deals: SeedDeal[] = [
  // Rainey Street Bar & Grill (index 0)
  {
    venueIndex: 0,
    day_of_week: [1, 2, 3, 4, 5],
    start_time: '15:00',
    end_time: '18:00',
    description: '$5 house margaritas and $3 Lone Star drafts',
    deal_type: 'drinks',
  },
  {
    venueIndex: 0,
    day_of_week: [1, 2, 3, 4, 5],
    start_time: '15:00',
    end_time: '18:00',
    description: 'Half-price queso and wings',
    deal_type: 'food',
  },
  // South Congress Brewing Co. (index 1)
  {
    venueIndex: 1,
    day_of_week: [2, 3, 4],
    start_time: '16:00',
    end_time: '19:00',
    description: '$2 off all house-brewed pints',
    deal_type: 'drinks',
  },
  {
    venueIndex: 1,
    day_of_week: [5],
    start_time: '14:00',
    end_time: '18:00',
    description: 'Friday flight special: 4 tasters for $8 plus free soft pretzel',
    deal_type: 'both',
  },
  // The Driskill Lounge (index 2)
  {
    venueIndex: 2,
    day_of_week: [1, 2, 3, 4],
    start_time: '17:00',
    end_time: '19:00',
    description: '$8 craft cocktails and complimentary charcuterie board',
    deal_type: 'both',
  },
  {
    venueIndex: 2,
    day_of_week: [5, 6],
    start_time: '16:00',
    end_time: '18:00',
    description: '$6 glasses of select wines',
    deal_type: 'drinks',
  },
  // East 6th Pub (index 3)
  {
    venueIndex: 3,
    day_of_week: [0, 1, 2, 3, 4, 5, 6],
    start_time: '11:00',
    end_time: '14:00',
    description: 'Lunch happy hour: $4 pints and $7 burger combo',
    deal_type: 'both',
  },
  {
    venueIndex: 3,
    day_of_week: [3],
    start_time: '20:00',
    end_time: '23:00',
    description: 'Wednesday night: $1 off all wells and domestics',
    deal_type: 'drinks',
  },
  {
    venueIndex: 3,
    day_of_week: [4, 5],
    start_time: '16:00',
    end_time: '19:00',
    description: 'Half-price appetizers with any drink purchase',
    deal_type: 'food',
  },
  // Barton Creek Winery (index 4)
  {
    venueIndex: 4,
    day_of_week: [4, 5],
    start_time: '14:00',
    end_time: '17:00',
    description: 'Wine tasting flights: 5 pours for $12',
    deal_type: 'drinks',
  },
  {
    venueIndex: 4,
    day_of_week: [6],
    start_time: '13:00',
    end_time: '16:00',
    description: 'Saturday sipper: buy a bottle, get a cheese plate free',
    deal_type: 'both',
  },
  // Lamar Union Food Hall (index 5)
  {
    venueIndex: 5,
    day_of_week: [1, 2, 3, 4, 5],
    start_time: '15:00',
    end_time: '18:00',
    description: '$6 house cocktails and half-price small plates',
    deal_type: 'both',
  },
  {
    venueIndex: 5,
    day_of_week: [0],
    start_time: '11:00',
    end_time: '15:00',
    description: 'Sunday brunch special: bottomless mimosas for $15',
    deal_type: 'drinks',
  },
  // Mueller Neighborhood Grill (index 6)
  {
    venueIndex: 6,
    day_of_week: [1, 2, 3, 4],
    start_time: '16:00',
    end_time: '18:00',
    description: '$3 domestic drafts and $5 loaded nachos',
    deal_type: 'both',
  },
  {
    venueIndex: 6,
    day_of_week: [5],
    start_time: '15:00',
    end_time: '19:00',
    description: 'Friday BOGO draft beers',
    deal_type: 'drinks',
  },
  // Domain Craft House (index 7)
  {
    venueIndex: 7,
    day_of_week: [1, 2, 3, 4, 5],
    start_time: '16:00',
    end_time: '19:00',
    description: '$5 craft drafts and $7 signature cocktails',
    deal_type: 'drinks',
  },
  {
    venueIndex: 7,
    day_of_week: [2, 4],
    start_time: '17:00',
    end_time: '20:00',
    description: 'Taco Tuesday & Throwback Thursday: $2 street tacos with drink purchase',
    deal_type: 'food',
  },
];

async function seed(): Promise<void> {
  console.log('Seeding database...');

  // ── Insert venues ──
  console.log('  Inserting venues...');
  const venueIds: string[] = [];

  for (const v of venues) {
    const result = await query<{ id: string }>(
      `INSERT INTO venues (name, address, city, state, zip, location, phone, website, image_url, category)
       VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography, $8, $9, $10, $11)
       RETURNING id`,
      [
        v.name,
        v.address,
        v.city,
        v.state,
        v.zip,
        v.lng,
        v.lat,
        v.phone,
        v.website,
        v.image_url,
        v.category,
      ]
    );
    venueIds.push(result.rows[0].id);
  }
  console.log(`  Inserted ${venueIds.length} venues.`);

  // ── Insert deals ──
  console.log('  Inserting deals...');
  let dealCount = 0;

  for (const d of deals) {
    await query(
      `INSERT INTO happy_hour_deals (venue_id, day_of_week, start_time, end_time, description, deal_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        venueIds[d.venueIndex],
        d.day_of_week,
        d.start_time,
        d.end_time,
        d.description,
        d.deal_type,
      ]
    );
    dealCount++;
  }
  console.log(`  Inserted ${dealCount} deals.`);

  // ── Insert admin user ──
  console.log('  Inserting admin user...');
  const passwordHash = await bcrypt.hash('admin123', SALT_ROUNDS);
  await query(
    `INSERT INTO admin_users (email, password_hash, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING`,
    ['admin@happyhour.com', passwordHash, 'super_admin']
  );
  console.log('  Admin user created (admin@happyhour.com).');

  console.log('Seeding complete.');
}

async function main(): Promise<void> {
  try {
    await seed();
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();
