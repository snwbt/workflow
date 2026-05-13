'use client';

import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import type { FloorPlanData, SeatingAssignment, SeatingPerson, Table } from '@/lib/seatingTypes';
import { useSiteText } from '@/lib/sitePreferences';
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
  wayfinding?: boolean;
  onSeatClick?: (tableId: string, seatNumber: number) => void;
}

interface RouteData {
  path: string;
  arrowX: number;
  arrowY: number;
  arrowAngle: number;
  focusX: number;
  focusY: number;
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

function buildWayfindingRoute(floorplan: FloorPlanData, selectedSeat?: { tableId: string; seatNumber: number } | null): RouteData | null {
  if (!selectedSeat) return null;

  const table = floorplan.tables.find((item) => item.id === selectedSeat.tableId);
  const seat = table?.seats.find((item) => item.seatNumber === selectedSeat.seatNumber);
  if (!table || !seat) return null;

  const seatPoint = seatPosition(table, seat.angle, seat.radius);
  const entranceX = floorplan.entrance.cx;
  const entranceY = floorplan.entrance.cy - floorplan.entrance.height / 2;
  const aisleY = floorplan.walkway.labelPosition?.y ?? Math.min(Math.max(table.cy, 300), 370);
  const approachX = Math.max(220, Math.min(table.cx, floorplan.viewBox.width - 160));
  const approachY = table.cy > aisleY ? Math.min(table.cy - 70, aisleY + 120) : Math.max(table.cy + 70, aisleY - 120);

  return {
    path: [
      `M ${entranceX} ${entranceY}`,
      `L ${entranceX} ${aisleY + 42}`,
      `Q ${entranceX} ${aisleY} ${approachX} ${aisleY}`,
      `L ${approachX} ${approachY}`,
      `Q ${approachX} ${table.cy} ${table.cx} ${table.cy}`,
      `L ${seatPoint.cx} ${seatPoint.cy}`,
    ].join(' '),
    arrowX: seatPoint.cx,
    arrowY: seatPoint.cy,
    arrowAngle: Math.atan2(seatPoint.cy - table.cy, seatPoint.cx - table.cx) * 180 / Math.PI,
    focusX: table.cx,
    focusY: table.cy,
  };
}

function getZoomTransform(floorplan: FloorPlanData, route: RouteData | null) {
  if (!route) return 'translate(0 0) scale(1)';
  const scale = 1.72;
  const centerX = floorplan.viewBox.width / 2;
  const centerY = floorplan.viewBox.height / 2;
  const translateX = centerX - route.focusX * scale;
  const translateY = centerY - route.focusY * scale;
  return `translate(${translateX} ${translateY}) scale(${scale})`;
}

export default function SeatPlan({
  floorplan,
  assignments = [],
  roster = [],
  selectedPersonId,
  selectedSeat,
  showOccupants = false,
  readonly = false,
  wayfinding = false,
  onSeatClick,
}: SeatPlanProps) {
  const { t } = useSiteText();
  const [routeSettled, setRouteSettled] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const occupants = buildOccupants(assignments, roster);
  const assignmentCounts = new Map<string, number>();
  const route = useMemo(() => buildWayfindingRoute(floorplan, selectedSeat), [floorplan, selectedSeat]);
  const showRoute = wayfinding && Boolean(route);

  assignments.forEach((assignment) => {
    assignmentCounts.set(assignment.tableId, (assignmentCounts.get(assignment.tableId) || 0) + 1);
  });

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    setRouteSettled(false);
    if (!showRoute) return;
    if (reduceMotion) {
      setRouteSettled(true);
      return;
    }

    const timer = window.setTimeout(() => setRouteSettled(true), 2100);
    return () => window.clearTimeout(timer);
  }, [reduceMotion, selectedSeat?.seatNumber, selectedSeat?.tableId, showRoute]);

  return (
    <div className={`${styles.planFrame} ${showRoute ? styles.planFrameWayfinding : ''}`}>
      <svg
        viewBox={`0 0 ${floorplan.viewBox.width} ${floorplan.viewBox.height}`}
        className={styles.plan}
        role="img"
        aria-label={t('Wedding dinner seating plan')}
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
          <filter id="route-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="var(--seatplan-route)" floodOpacity="0.34" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <motion.g
          animate={{
            transform: showRoute && !routeSettled && !reduceMotion ? getZoomTransform(floorplan, route) : 'translate(0 0) scale(1)',
          }}
          transition={{ duration: reduceMotion ? 0 : 1.15, ease: [0.16, 1, 0.3, 1] }}
        >
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
                  {t(line)}
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
              {t(floorplan.walkway.label)}
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
            {t(floorplan.entrance.label)}
          </text>
          <text x={floorplan.entrance.cx} y={floorplan.entrance.cy + 24} textAnchor="middle" className={styles.helperText}>
            {t(floorplan.entrance.helperText)}
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
        {showRoute && route && (
          <g className={styles.routeLayer} aria-hidden="true">
            <motion.path
              key={route.path}
              d={route.path}
              className={styles.routePath}
              filter="url(#route-glow)"
              initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: reduceMotion ? 0 : 1.85, ease: 'easeInOut' }}
            />
            <motion.g
              className={styles.routeArrow}
              transform={`translate(${route.arrowX} ${route.arrowY}) rotate(${route.arrowAngle})`}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.82 }}
              animate={{
                opacity: routeSettled || reduceMotion ? [0.55, 1, 0.55] : 0,
                scale: routeSettled || reduceMotion ? [0.92, 1.16, 0.92] : 0.82,
              }}
              transition={{
                delay: reduceMotion ? 0 : 0.1,
                duration: reduceMotion ? 0 : 1.05,
                repeat: routeSettled || reduceMotion ? Infinity : 0,
              }}
            >
              <path d="M -20,-12 L 22,0 L -20,12 L -11,0 Z" />
            </motion.g>
          </g>
        )}
        </motion.g>
      </svg>
    </div>
  );
}
