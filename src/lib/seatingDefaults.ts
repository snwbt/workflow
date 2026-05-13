import type { FloorPlanData, Seat, SeatingState } from './seatingTypes';

function roundSeats(count = 10, radius = 65): Seat[] {
  return Array.from({ length: count }, (_, index) => ({
    seatNumber: index + 1,
    angle: index * (360 / count),
    radius,
  }));
}

function table(id: string, label: string, cx: number, cy: number) {
  return {
    id,
    label,
    shape: 'round' as const,
    cx,
    cy,
    rx: 48,
    seats: roundSeats(),
  };
}

export const defaultFloorPlan: FloorPlanData = {
  viewBox: { width: 1800, height: 650 },
  tables: [
    table('t1', '1', 300, 175),
    table('t2', '2', 460, 175),
    table('t3', '3', 620, 175),
    table('t4', '4', 780, 175),
    table('t5', '5', 940, 175),
    table('t6', '6', 1100, 175),
    table('t7', '7', 1260, 175),
    table('t8', '8', 1420, 175),
    table('t9', '9', 1580, 175),
    table('t10', '10', 300, 490),
    table('t11', '11', 470, 490),
    table('t12', '12', 640, 490),
    table('t13', '13', 810, 490),
    table('t14', '14', 980, 490),
    table('t15', '15', 1150, 490),
    table('t16', '16', 1320, 490),
    table('t17', '17', 1490, 490),
  ],
  decorations: [
    { type: 'stage', label: 'Screen', cx: 420, cy: 35, width: 200, height: 22 },
    { type: 'stage', label: 'Screen', cx: 860, cy: 35, width: 200, height: 22 },
    { type: 'stage', label: 'Screen', cx: 1770, cy: 335, width: 22, height: 160 },
    { type: 'danceFloor', label: 'Rostrum', cx: 110, cy: 185, width: 75, height: 50 },
    { type: 'bar', label: 'Wedding\nCake', cx: 110, cy: 310, width: 75, height: 65 },
    { type: 'bar', label: 'Champagne\nFountain', cx: 110, cy: 430, width: 75, height: 55 },
  ],
  walkway: {
    points: [],
    label: 'Wedding aisle',
    path: 'M 200,308 L 1620,308 A 72,72 0 0,1 1692,380 L 1692,592 L 1638,592 L 1638,380 A 18,18 0 0,0 1620,362 L 200,362 Z',
    labelPosition: { x: 900, y: 335 },
  },
  entrance: {
    cx: 1665,
    cy: 618,
    width: 100,
    height: 28,
    label: 'Entrance',
    helperText: 'You are entering from here',
  },
};

export const defaultSeatingState: SeatingState = {
  floorplan: defaultFloorPlan,
  assignments: [],
};
