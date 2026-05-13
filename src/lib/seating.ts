import 'server-only';

import type { FloorPlanData, SeatingAssignment, SeatingConflict, SeatingPerson, SeatingState } from './seatingTypes';
import { defaultSeatingState } from './seatingDefaults';

function normalize(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactId(value: string) {
  return normalize(value).replace(/\s+/g, '-').slice(0, 48) || 'guest';
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || name.trim(),
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
  };
}

function splitAdditionalNames(value?: string) {
  return String(value || '')
    .split(/\r?\n|;|,/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function addPerson(people: SeatingPerson[], seenNames: Set<string>, person: SeatingPerson) {
  const key = normalize(person.displayName);
  if (!key || seenNames.has(key)) return;
  seenNames.add(key);
  people.push(person);
}

export function normalizeSeatingState(value: unknown): SeatingState {
  const state = (value || {}) as Partial<SeatingState>;
  return {
    floorplan: state.floorplan?.tables?.length ? state.floorplan : defaultSeatingState.floorplan,
    assignments: Array.isArray(state.assignments) ? state.assignments : [],
    updatedAt: state.updatedAt,
  };
}

export function deriveSeatingRoster(db: any): SeatingPerson[] {
  const people: SeatingPerson[] = [];
  const seenNames = new Set<string>();

  for (const guest of db.guests || []) {
    const displayName = [guest.first_name, guest.last_name].filter(Boolean).join(' ').trim();
    if (!displayName) continue;

    addPerson(people, seenNames, {
      id: `guest:${guest.guest_id || guest.party_id || compactId(displayName)}`,
      displayName,
      firstName: guest.first_name || splitName(displayName).firstName,
      lastName: guest.last_name || splitName(displayName).lastName,
      source: 'guest',
      guestId: guest.guest_id,
      partyId: guest.party_id,
      dietary: guest.dietary_restrictions || guest.dietary,
      accessibility: guest.accessibility_requirements,
    });
  }

  for (const rsvp of db.rsvps || []) {
    const isDinnerGuest =
      rsvp.attendance_status === 'attending' &&
      (rsvp.dinner_attendance === 'yes' || (!rsvp.invite_type && !rsvp.dinner_attendance));

    if (!isDinnerGuest) continue;

    const rsvpId = rsvp.rsvp_id || compactId(`${rsvp.guest_name}-${rsvp.email}`);
    const primaryName = String(rsvp.guest_name || '').trim();
    const names = [
      primaryName,
      ...splitAdditionalNames(rsvp.additional_guest_names || rsvp.plus_one_name),
    ].filter(Boolean);
    const expectedCount = Math.max(Number(rsvp.guest_count || names.length || 1), 1);

    names.forEach((name, index) => {
      const split = splitName(name);
      addPerson(people, seenNames, {
        id: index === 0 ? `rsvp:${rsvpId}:primary` : `rsvp:${rsvpId}:guest:${index}:${compactId(name)}`,
        displayName: name,
        firstName: split.firstName,
        lastName: split.lastName,
        source: 'rsvp',
        rsvpId,
        email: index === 0 ? rsvp.email : undefined,
        dietary: rsvp.dietary_restrictions,
        accessibility: rsvp.accessibility_requirements,
      });
    });

    for (let index = names.length; index < expectedCount; index++) {
      const base = primaryName || rsvp.email || 'Guest';
      const displayName = `Guest of ${splitName(base).firstName} #${index + 1}`;
      addPerson(people, seenNames, {
        id: `rsvp:${rsvpId}:placeholder:${index + 1}`,
        displayName,
        firstName: displayName,
        source: 'placeholder',
        rsvpId,
        dietary: rsvp.dietary_restrictions,
        accessibility: rsvp.accessibility_requirements,
      });
    }
  }

  return people.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function validateSeatingAssignments(
  assignments: SeatingAssignment[],
  people: SeatingPerson[],
  floorplan: FloorPlanData
) {
  const conflicts: SeatingConflict[] = [];
  const personIds = new Set(people.map((person) => person.id));
  const seatIds = new Set(
    floorplan.tables.flatMap((table) =>
      table.seats.map((seat) => `${table.id}:${seat.seatNumber}`)
    )
  );
  const seenPeople = new Set<string>();
  const seenSeats = new Set<string>();

  for (const assignment of assignments) {
    const seatKey = `${assignment.tableId}:${assignment.seatNumber}`;

    if (!personIds.has(assignment.personId)) {
      conflicts.push({
        type: 'unknown-person',
        message: 'Assignment references a guest who is no longer in the roster.',
        personId: assignment.personId,
      });
    }

    if (!seatIds.has(seatKey)) {
      conflicts.push({
        type: 'unknown-seat',
        message: 'Assignment references a seat that does not exist in the floorplan.',
        personId: assignment.personId,
        tableId: assignment.tableId,
        seatNumber: assignment.seatNumber,
      });
    }

    if (seenPeople.has(assignment.personId)) {
      conflicts.push({
        type: 'duplicate-person',
        message: 'A guest is assigned to more than one seat.',
        personId: assignment.personId,
      });
    }
    seenPeople.add(assignment.personId);

    if (seenSeats.has(seatKey)) {
      conflicts.push({
        type: 'duplicate-seat',
        message: 'More than one guest is assigned to the same seat.',
        personId: assignment.personId,
        tableId: assignment.tableId,
        seatNumber: assignment.seatNumber,
      });
    }
    seenSeats.add(seatKey);
  }

  return conflicts;
}

export function sanitizeAssignments(assignments: SeatingAssignment[]) {
  return assignments
    .filter((assignment) => assignment.personId && assignment.tableId && Number.isInteger(Number(assignment.seatNumber)))
    .map((assignment) => ({
      personId: String(assignment.personId),
      tableId: String(assignment.tableId),
      seatNumber: Number(assignment.seatNumber),
      updatedAt: assignment.updatedAt || new Date().toISOString(),
    }));
}

export function searchAssignedGuests(
  query: string,
  people: SeatingPerson[],
  assignments: SeatingAssignment[],
  floorplan: FloorPlanData
) {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length < 2) return [];

  const peopleById = new Map(people.map((person) => [person.id, person]));
  const tablesById = new Map(floorplan.tables.map((table) => [table.id, table]));

  return assignments
    .map((assignment) => {
      const person = peopleById.get(assignment.personId);
      const table = tablesById.get(assignment.tableId);
      if (!person || !table) return null;
      return { assignment, person, table };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter(({ person }) => normalize(person.displayName).includes(normalizedQuery))
    .slice(0, 8)
    .map(({ assignment, person, table }) => ({
      personId: person.id,
      displayName: person.displayName,
      tableId: table.id,
      tableLabel: table.label,
      seatNumber: assignment.seatNumber,
    }));
}
