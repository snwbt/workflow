export interface WeddingVenue {
  key: 'dayOne' | 'dayTwo';
  dateLabel: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  arrivalNote?: string;
  imageUrl?: string;
  imageAlt?: string;
  mrtStation?: string;
  mrtDirections?: string;
  busStop?: string;
  busDirections?: string;
  parking?: string;
  dropoff?: string;
  hotelDirections?: string;
  accessibility?: string;
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getWeddingVenues(config: Record<string, any> = {}, venueSection: Record<string, any> = {}) {
  const dayOne: WeddingVenue = {
    key: 'dayOne',
    dateLabel: '23 October',
    name: config.VENUE_NAME || venueSection.heading || '',
    address: config.VENUE_ADDRESS || '',
    lat: optionalNumber(config.VENUE_LAT),
    lng: optionalNumber(config.VENUE_LNG),
    arrivalNote: config.VENUE_ARRIVAL_NOTE || '',
    imageUrl: venueSection.mediaUrl || '',
    imageAlt: venueSection.imageAlt || config.VENUE_NAME || '23 October venue',
    mrtStation: config.TRAVEL_MRT_STATION || '',
    mrtDirections: config.TRAVEL_MRT_DIRECTIONS || '',
    busStop: config.TRAVEL_BUS_STOP || '',
    busDirections: config.TRAVEL_BUS_DIRECTIONS || '',
    parking: config.TRAVEL_PARKING || '',
    dropoff: config.TRAVEL_DROPOFF || '',
    hotelDirections: config.TRAVEL_HOTEL_DIRECTIONS || '',
    accessibility: config.TRAVEL_ACCESSIBILITY || '',
  };

  const dayTwo: WeddingVenue = {
    key: 'dayTwo',
    dateLabel: '24 October',
    name: config.VENUE_DAY_TWO_NAME || '',
    address: config.VENUE_DAY_TWO_ADDRESS || '',
    lat: optionalNumber(config.VENUE_DAY_TWO_LAT),
    lng: optionalNumber(config.VENUE_DAY_TWO_LNG),
    arrivalNote: config.VENUE_DAY_TWO_ARRIVAL_NOTE || '',
    imageUrl: config.VENUE_DAY_TWO_IMAGE || '',
    imageAlt: config.VENUE_DAY_TWO_IMAGE_ALT || config.VENUE_DAY_TWO_NAME || '24 October venue',
    mrtStation: config.TRAVEL_DAY_TWO_MRT_STATION || '',
    mrtDirections: config.TRAVEL_DAY_TWO_MRT_DIRECTIONS || '',
    busStop: config.TRAVEL_DAY_TWO_BUS_STOP || '',
    busDirections: config.TRAVEL_DAY_TWO_BUS_DIRECTIONS || '',
    parking: config.TRAVEL_DAY_TWO_PARKING || '',
    dropoff: config.TRAVEL_DAY_TWO_DROPOFF || '',
    hotelDirections: config.TRAVEL_DAY_TWO_HOTEL_DIRECTIONS || '',
    accessibility: config.TRAVEL_DAY_TWO_ACCESSIBILITY || '',
  };

  return [dayOne, dayTwo].filter((venue) => venue.name || venue.address);
}

export function getGoogleMapsUrl(venue: WeddingVenue) {
  if (venue.lat !== undefined && venue.lng !== undefined) {
    return `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`;
  }

  if (venue.address) {
    return `https://www.google.com/maps/search/${encodeURIComponent(venue.address)}`;
  }

  return null;
}
