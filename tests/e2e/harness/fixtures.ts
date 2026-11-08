/**
 * SafeFreight OS — Deterministic Test Fixtures & NH 48 Corridor Ground Truth
 * Derived from PRD v4.0.0 §12 (Personas, Corridors & Waypoints)
 */

export interface CorridorWaypoint {
  id: string;
  name: string;
  city: string;
  state: 'MH' | 'GJ';
  lat: number;
  lng: number;
  cumulativeKmFromJNPT: number;
}

export const NH48_WESTERN_CORRIDOR_WAYPOINTS: CorridorWaypoint[] = [
  {
    id: 'WP-01',
    name: 'Mumbai JNPT Port Container Terminal',
    city: 'Mumbai',
    state: 'MH',
    lat: 18.9496,
    lng: 72.9515,
    cumulativeKmFromJNPT: 0,
  },
  {
    id: 'WP-02',
    name: 'Vapi GIDC Industrial Checkpoint',
    city: 'Vapi',
    state: 'GJ',
    lat: 20.3712,
    lng: 72.9044,
    cumulativeKmFromJNPT: 165,
  },
  {
    id: 'WP-03',
    name: 'Surat Kadodara Ring Road Junction',
    city: 'Surat',
    state: 'GJ',
    lat: 21.1702,
    lng: 72.8311,
    cumulativeKmFromJNPT: 285,
  },
  {
    id: 'WP-04',
    name: 'Bharuch Narmada River Toll Plaza',
    city: 'Bharuch',
    state: 'GJ',
    lat: 21.6264,
    lng: 73.0152,
    cumulativeKmFromJNPT: 360,
  },
  {
    id: 'WP-05',
    name: 'Vadodara Ranoli GIDC Logistics Hub',
    city: 'Vadodara',
    state: 'GJ',
    lat: 22.3072,
    lng: 73.1812,
    cumulativeKmFromJNPT: 440,
  },
  {
    id: 'WP-06',
    name: 'Ahmedabad Changodar Industrial Hub',
    city: 'Ahmedabad',
    state: 'GJ',
    lat: 22.9298,
    lng: 72.4518,
    cumulativeKmFromJNPT: 525,
  },
];

export interface TestOrganizationFixture {
  id: string;
  name: string;
  type: 'fleet_operator' | 'shipper';
  gstin: string;
}

export interface TestProfileFixture {
  id: string;
  organizationId: string;
  role: 'fleet_admin' | 'shipper' | 'driver';
  name: string;
  phone: string;
  email: string;
  language: 'hi' | 'gu' | 'mr' | 'te' | 'en';
  vehicleNumber?: string;
  drivingLicense?: string;
  fastagId?: string;
  status: 'active' | 'on_trip' | 'idle' | 'alert';
}

export const TEST_ORGS = {
  FLEET_WIFL: {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Western India Fleet Logistics',
    type: 'fleet_operator',
    gstin: '24AAACW1234F1Z5',
  } as TestOrganizationFixture,

  SHIPPER_ADANI: {
    id: '00000000-0000-4000-8000-000000000002',
    name: 'Adani Logistics Forwarders Ltd',
    type: 'shipper',
    gstin: '24AAACA9876G1ZA',
  } as TestOrganizationFixture,

  SHIPPER_ULTRATECH: {
    id: '00000000-0000-4000-8000-000000000003',
    name: 'Ultratech Cement Distribution Hub',
    type: 'shipper',
    gstin: '27AAACU5555M1Z8',
  } as TestOrganizationFixture,
};

export const TEST_PROFILES = {
  FLEET_ADMIN_BALWINDER: {
    id: '10000000-0000-4000-8000-000000000001',
    organizationId: TEST_ORGS.FLEET_WIFL.id,
    role: 'fleet_admin',
    name: 'Sardar Balwinder Singh',
    phone: '+919825012345',
    email: 'balwinder@wifl-logistics.in',
    language: 'hi',
    status: 'active',
  } as TestProfileFixture,

  DRIVER_RAMESH: {
    id: '20000000-0000-4000-8000-000000000001',
    organizationId: TEST_ORGS.FLEET_WIFL.id,
    role: 'driver',
    name: 'Ramesh Patel',
    phone: '+919879054321',
    email: 'ramesh.signa4825@gmail.com',
    language: 'gu',
    vehicleNumber: 'GJ-05-BZ-8821',
    drivingLicense: 'GJ0520180012345',
    fastagId: '34161FA820392019',
    status: 'active',
  } as TestProfileFixture,

  SHIPPER_ADANI_EXEC: {
    id: '30000000-0000-4000-8000-000000000001',
    organizationId: TEST_ORGS.SHIPPER_ADANI.id,
    role: 'shipper',
    name: 'Vikram Mehta',
    phone: '+919820098765',
    email: 'v.mehta@adani-freight.com',
    language: 'en',
    status: 'active',
  } as TestProfileFixture,
};
