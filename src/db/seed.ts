import bcrypt from 'bcryptjs';
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
  // ── Vancouver, BC ──
  {
    name: 'Yaletown Brewing Company',
    address: '1111 Mainland St',
    city: 'Vancouver',
    state: 'BC',
    zip: 'V6B 5P2',
    lat: 49.2748,
    lng: -123.1208,
    phone: '604-555-0901',
    website: null,
    image_url: null,
    category: 'brewery',
  },
  {
    name: 'The Keefer Bar',
    address: '135 Keefer St',
    city: 'Vancouver',
    state: 'BC',
    zip: 'V6A 1X3',
    lat: 49.2790,
    lng: -123.1005,
    phone: '604-555-0902',
    website: null,
    image_url: null,
    category: 'lounge',
  },
  {
    name: 'Gastown Pub',
    address: '131 Water St',
    city: 'Vancouver',
    state: 'BC',
    zip: 'V6B 4M3',
    lat: 49.2844,
    lng: -123.1088,
    phone: '604-555-0903',
    website: null,
    image_url: null,
    category: 'pub',
  },
  {
    name: 'Granville Island Taphouse',
    address: '1580 Johnston St',
    city: 'Vancouver',
    state: 'BC',
    zip: 'V6H 3S2',
    lat: 49.2713,
    lng: -123.1340,
    phone: '604-555-0904',
    website: null,
    image_url: null,
    category: 'bar',
  },
  {
    name: 'Kitsilano Wine Bar',
    address: '2206 Cornwall Ave',
    city: 'Vancouver',
    state: 'BC',
    zip: 'V6K 1B5',
    lat: 49.2685,
    lng: -123.1490,
    phone: '604-555-0905',
    website: null,
    image_url: null,
    category: 'winery',
  },
  {
    name: 'Main Street Eatery',
    address: '4250 Main St',
    city: 'Vancouver',
    state: 'BC',
    zip: 'V5V 3P9',
    lat: 49.2460,
    lng: -123.1010,
    phone: '604-555-0906',
    website: null,
    image_url: null,
    category: 'restaurant',
  },
  // ── San Francisco, CA ──
  {
    name: 'Zeitgeist',
    address: '199 Valencia St',
    city: 'San Francisco',
    state: 'CA',
    zip: '94103',
    lat: 37.7701,
    lng: -122.4222,
    phone: '415-555-0801',
    website: null,
    image_url: null,
    category: 'bar',
  },
  {
    name: 'Anchor Brewing Taproom',
    address: '1705 Mariposa St',
    city: 'San Francisco',
    state: 'CA',
    zip: '94107',
    lat: 37.7637,
    lng: -122.3964,
    phone: '415-555-0802',
    website: null,
    image_url: null,
    category: 'brewery',
  },
  {
    name: 'Smuggler\'s Cove',
    address: '650 Gough St',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
    lat: 37.7782,
    lng: -122.4243,
    phone: '415-555-0803',
    website: null,
    image_url: null,
    category: 'lounge',
  },
  {
    name: 'The Pub at Ghirardelli',
    address: '900 North Point St',
    city: 'San Francisco',
    state: 'CA',
    zip: '94109',
    lat: 37.8060,
    lng: -122.4230,
    phone: '415-555-0804',
    website: null,
    image_url: null,
    category: 'pub',
  },
  {
    name: 'Ferry Building Wine Bar',
    address: '1 Ferry Building',
    city: 'San Francisco',
    state: 'CA',
    zip: '94111',
    lat: 37.7956,
    lng: -122.3935,
    phone: '415-555-0805',
    website: null,
    image_url: null,
    category: 'winery',
  },
  {
    name: 'Mission Street Tacos & Tequila',
    address: '2850 Mission St',
    city: 'San Francisco',
    state: 'CA',
    zip: '94110',
    lat: 37.7520,
    lng: -122.4185,
    phone: '415-555-0806',
    website: null,
    image_url: null,
    category: 'restaurant',
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
  // ── Vancouver ──
  // Yaletown Brewing Company (index 8)
  {
    venueIndex: 8,
    day_of_week: [1, 2, 3, 4, 5],
    start_time: '15:00',
    end_time: '18:00',
    description: '$6 house pints and $8 flights of 4',
    deal_type: 'drinks',
  },
  {
    venueIndex: 8,
    day_of_week: [1, 2, 3, 4, 5],
    start_time: '15:00',
    end_time: '18:00',
    description: 'Half-price flatbreads and calamari',
    deal_type: 'food',
  },
  // The Keefer Bar (index 9)
  {
    venueIndex: 9,
    day_of_week: [1, 2, 3, 4],
    start_time: '17:00',
    end_time: '19:00',
    description: '$10 signature cocktails and complimentary bao buns',
    deal_type: 'both',
  },
  // Gastown Pub (index 10)
  {
    venueIndex: 10,
    day_of_week: [0, 1, 2, 3, 4, 5, 6],
    start_time: '11:00',
    end_time: '14:00',
    description: 'Lunch rush: $5 pints and $9 burger combo',
    deal_type: 'both',
  },
  {
    venueIndex: 10,
    day_of_week: [3],
    start_time: '20:00',
    end_time: '23:00',
    description: 'Wing Wednesday: 50-cent wings with any drink',
    deal_type: 'food',
  },
  // Granville Island Taphouse (index 11)
  {
    venueIndex: 11,
    day_of_week: [4, 5, 6],
    start_time: '15:00',
    end_time: '18:00',
    description: '$5 local craft drafts and $7 BC wines by the glass',
    deal_type: 'drinks',
  },
  // Kitsilano Wine Bar (index 12)
  {
    venueIndex: 12,
    day_of_week: [2, 3, 4],
    start_time: '16:00',
    end_time: '19:00',
    description: 'Half-price bottles from the BC wine list',
    deal_type: 'drinks',
  },
  {
    venueIndex: 12,
    day_of_week: [5],
    start_time: '16:00',
    end_time: '19:00',
    description: 'Friday cheese & charcuterie board with any bottle purchase',
    deal_type: 'both',
  },
  // Main Street Eatery (index 13)
  {
    venueIndex: 13,
    day_of_week: [1, 2, 3, 4, 5],
    start_time: '15:00',
    end_time: '18:00',
    description: '$7 cocktails and half-price small plates',
    deal_type: 'both',
  },
  {
    venueIndex: 13,
    day_of_week: [0],
    start_time: '11:00',
    end_time: '15:00',
    description: 'Sunday brunch: bottomless caesars for $18',
    deal_type: 'drinks',
  },
  // ── San Francisco ──
  // Zeitgeist (index 14)
  {
    venueIndex: 14,
    day_of_week: [1, 2, 3, 4, 5],
    start_time: '14:00',
    end_time: '18:00',
    description: '$4 Anchor Steam pints and $6 bloody marys',
    deal_type: 'drinks',
  },
  {
    venueIndex: 14,
    day_of_week: [6, 0],
    start_time: '12:00',
    end_time: '16:00',
    description: 'Weekend day-drinking: $3 tallboys in the beer garden',
    deal_type: 'drinks',
  },
  // Anchor Brewing Taproom (index 15)
  {
    venueIndex: 15,
    day_of_week: [2, 3, 4],
    start_time: '16:00',
    end_time: '19:00',
    description: '$3 off all Anchor pints and free pretzel bites',
    deal_type: 'both',
  },
  {
    venueIndex: 15,
    day_of_week: [5],
    start_time: '15:00',
    end_time: '19:00',
    description: 'Friday flight: 5 tasters for $10',
    deal_type: 'drinks',
  },
  // Smuggler's Cove (index 16)
  {
    venueIndex: 16,
    day_of_week: [1, 2, 3, 4],
    start_time: '17:00',
    end_time: '19:00',
    description: '$9 classic tiki cocktails',
    deal_type: 'drinks',
  },
  // The Pub at Ghirardelli (index 17)
  {
    venueIndex: 17,
    day_of_week: [0, 1, 2, 3, 4, 5, 6],
    start_time: '15:00',
    end_time: '18:00',
    description: '$5 local drafts and $8 fish & chips',
    deal_type: 'both',
  },
  // Ferry Building Wine Bar (index 18)
  {
    venueIndex: 18,
    day_of_week: [3, 4, 5],
    start_time: '16:00',
    end_time: '19:00',
    description: 'Half-price Napa & Sonoma pours',
    deal_type: 'drinks',
  },
  {
    venueIndex: 18,
    day_of_week: [5],
    start_time: '16:00',
    end_time: '19:00',
    description: 'Friday oyster & wine pairing: 6 oysters + glass for $14',
    deal_type: 'both',
  },
  // Mission Street Tacos & Tequila (index 19)
  {
    venueIndex: 19,
    day_of_week: [1, 2, 3, 4, 5],
    start_time: '15:00',
    end_time: '18:00',
    description: '$5 margaritas and $2 street tacos',
    deal_type: 'both',
  },
  {
    venueIndex: 19,
    day_of_week: [2],
    start_time: '17:00',
    end_time: '21:00',
    description: 'Tequila Tuesday: half-price top-shelf pours',
    deal_type: 'drinks',
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
