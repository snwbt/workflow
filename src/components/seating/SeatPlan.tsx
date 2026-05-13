'use client';

import { motion } from 'framer-motion';
import type { FloorPlanData, SeatingAssignment, SeatingPerson, Table } from '@/lib/seatingTypes';
import styles from './SeatPlan.module.css';

interface SeatOccupant {
  personId: string;
  displayName?: string;
}

interface SeatPlanProps {
  floorplan: FloorPlanData;
  assignments?: SeatingAssignment[];
  roster?: SeatingPerson[];
  selectedPersonId?: string;
  selectedSeat?: { tableId: string; seatNumber: number } | null;
  showOccupants?: boolean;
  readonly?: boolean;
  onSeatClick?: (tableId: string, seatNumber: number) => void;
}

function seatPosition(table: Table, angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180;
  return {
    cx: table.cx + radius * Math.cos(rad),
    cy: table.cy + radius * Math.sin(rad),
  };
}

function buildOccupants(assignments: SeatingAssignment[] = [], roster: SeatingPerson[] = []) {
  const names = new Map(roster.map((person) => [person.id, person.displayName]));
  const occupants = new Map<string, SeatOccupant>();

  assignments.forEach((assignment) => {
    occupants.set(`${assignment.tableId}:${assignment.seatNumber}`, {
      personId: assignment.personId,
      displayName: names.get(assignment.personId),
    });
  });

  return occupants;
}

export default function SeatPlan({
  floorplan,
  assignments = [],
  roster = [],
  selectedPersonId,
  selectedSeat,
  showOccupants = false,
  readonly = false,
  onSeatClick,
}: SeatPlanProps) {
  const occupants = buildOccupants(assignments, roster);
  const assignmentCounts = new Map<string, number>();

  assignments.forEach((assignment) => {
    assignmentCounts.set(assignment.tableId, (assignmentCounts.get(assignment.tableId) || 0) + 1);
  });

  return (
    <div className={styles.planFrame}>
      <svg
        viewBox={`0 0 ${floorplan.viewBox.width} ${floorplan.viewBox.height}`}
        className={styles.plan}
        role="img"
        aria-label="Wedding dinner seating plan"
      >
        <defs>
          <filter id="seat-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feFlood floodColor="var(--seatplan-accent)" floodOpacity="0.35" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="20" y="20" width="1760" height="610" rx="4" className={styles.ballroom} />

        {[380, 660, 940, 1220].map((x) => (
          <rect key={x} x={x} y={622} width={60} height={12} rx={2} className={styles.door} />
        ))}

        <rect x={55} y={140} width={120} height={360} rx={6} className={styles.leftPanel} />

        {floorplan.decorations.map((decoration, index) => (
          <g key={`${decoration.type}-${index}`}>
            <rect
              x={decoration.cx - decoration.width / 2}
              y={decoration.cy - decoration.height / 2}
              width={decoration.width}
              height={decoration.height}
              rx={6}
              className={styles.decoration}
            />
            <text x={decoration.cx} y={decoration.cy} textAnchor="middle" dominantBaseline="central" className={styles.decorText}>
              {decoration.label.split('\n').map((line, lineIndex, lines) => (
                <tspan
                  key={line}
                  x={decoration.cx}
                  dy={lineIndex === 0 ? `${-(lines.length - 1) * 6}px` : '13'}
                >
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        ))}

        {floorplan.walkway.path && (
          <g>
            <path d={floorplan.walkway.path} className={styles.walkway} />
            <text
              x={floorplan.walkway.labelPosition?.x ?? 900}
              y={floorplan.walkway.labelPosition?.y ?? 335}
              textAnchor="middle"
              dominantBaseline="central"
              className={styles.walkwayText}
            >
              {floorplan.walkway.label}
            </text>
          </g>
        )}

        <g>
          <rect
            x={floorplan.entrance.cx - floorplan.entrance.width / 2}
            y={floorplan.entrance.cy - floorplan.entrance.height / 2}
            width={floorplan.entrance.width}
            height={floorplan.entrance.height}
            rx={4}
            className={styles.entrance}
          />
          <text x={floorplan.entrance.cx} y={floorplan.entrance.cy} textAnchor="middle" dominantBaseline="central" className={styles.entranceText}>
            {floorplan.entrance.label}
          </text>
          <text x={floorplan.entrance.cx} y={floorplan.entrance.cy + 24} textAnchor="middle" className={styles.helperText}>
            {floorplan.entrance.helperText}
          </text>
        </g>

        {floorplan.tables.map((table) => {
          const count = assignmentCounts.get(table.id) || 0;
          const selectedTable = selectedSeat?.tableId === table.id;

          return (
            <g key={table.id} data-table={table.id}>
              {table.shape === 'round' ? (
                <motion.circle
                  cx={table.cx}
                  cy={table.cy}
                  r={table.rx}
                  className={`${styles.table} ${selectedTable ? styles.tableHighlighted : ''}`}
                  animate={selectedTable ? { strokeOpacity: [1, 0.55, 1] } : undefined}
                  transition={selectedTable ? { duration: 1.8, repeat: Infinity } : undefined}
                />
              ) : (
                <rect
                  x={table.cx - table.rx}
                  y={table.cy - (table.ry ?? 40)}
                  width={table.rx * 2}
                  height={(table.ry ?? 40) * 2}
                  rx={8}
                  className={`${styles.table} ${selectedTable ? styles.tableHighlighted : ''}`}
                />
              )}
              <text x={table.cx} y={table.cy - 2} textAnchor="middle" className={styles.tableLabel}>
                {table.label}
              </text>
              {showOccupants && (
                <text x={table.cx} y={table.cy + 17} textAnchor="middle" className={styles.tableCount}>
                  {count}/{table.seats.length}
                </text>
              )}

              {table.seats.map((seat) => {
                const key = `${table.id}:${seat.seatNumber}`;
                const occupant = occupants.get(key);
                const isSelectedSeat = selectedSeat?.tableId === table.id && selectedSeat.seatNumber === seat.seatNumber;
                const isSelectedPerson = selectedPersonId && occupant?.personId === selectedPersonId;
                const position = seatPosition(table, seat.angle, seat.radius);

                return (
                  <motion.g key={seat.seatNumber}>
                    <motion.circle
                      cx={position.cx}
                      cy={position.cy}
                      r={isSelectedSeat || isSelectedPerson ? 11 : 8}
                      className={[
                        styles.seat,
                        occupant ? styles.seatOccupied : styles.seatEmpty,
                        isSelectedSeat || isSelectedPerson ? styles.seatHighlighted : '',
                        readonly ? styles.seatReadonly : '',
                      ].join(' ')}
                      filter={isSelectedSeat || isSelectedPerson ? 'url(#seat-glow)' : undefined}
                      onClick={() => !readonly && onSeatClick?.(table.id, seat.seatNumber)}
                      animate={isSelectedSeat || isSelectedPerson ? { r: [11, 13, 11] } : undefined}
                      transition={isSelectedSeat || isSelectedPerson ? { duration: 1.8, repeat: Infinity } : undefined}
                    >
                      <title>
                        Table {table.label}, seat {seat.seatNumber}
                        {occupant?.displayName ? `: ${occupant.displayName}` : ''}
                      </title>
                    </motion.circle>
                  </motion.g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
