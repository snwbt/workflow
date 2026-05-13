export interface Seat {
  seatNumber: number;
  angle: number;
  radius: number;
}

export interface Table {
  id: string;
  label: string;
  shape: 'round' | 'rect';
  cx: number;
  cy: number;
  rx: number;
  ry?: number;
  seats: Seat[];
  isHeadTable?: boolean;
}

export interface Decoration {
  type: 'stage' | 'danceFloor' | 'entrance' | 'bar' | 'storage';
  label: string;
  cx: number;
  cy: number;
  width: number;
  height: number;
}

export interface Walkway {
  points: Array<{ x: number; y: number }>;
  label: string;
  path?: string;
  labelPosition?: { x: number; y: number };
}

export interface Entrance {
  cx: number;
  cy: number;
  width: number;
  height: number;
  label: string;
  helperText: string;
}

export interface FloorPlanData {
  viewBox: { width: number; height: number };
  tables: Table[];
  decorations: Decoration[];
  walkway: Walkway;
  entrance: Entrance;
}

export interface SeatingAssignment {
  personId: string;
  tableId: string;
  seatNumber: number;
  updatedAt?: string;
}

export interface SeatingPerson {
  id: string;
  displayName: string;
  firstName: string;
  lastName?: string;
  source: 'guest' | 'rsvp' | 'placeholder';
  guestId?: string;
  rsvpId?: string;
  partyId?: string;
  email?: string;
  dietary?: string;
  accessibility?: string;
}

export interface SeatingState {
  floorplan: FloorPlanData;
  assignments: SeatingAssignment[];
  updatedAt?: string;
}

export interface SeatingConflict {
  type: 'duplicate-person' | 'duplicate-seat' | 'unknown-person' | 'unknown-seat';
  message: string;
  personId?: string;
  tableId?: string;
  seatNumber?: number;
}
