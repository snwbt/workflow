'use client';

import { animate, motion, useMotionValue } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  fitToFrame?: boolean;
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

interface ViewBoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const FOLLOW_WIDTH = 560;
const ROUTE_DRAW_DELAY = 520;
const ROUTE_DRAW_DURATION = 4.4;
const EASE_ELEGANT = [0.22, 1, 0.36, 1] as const;
const AISLE_Y = 335;
const AISLE_JOIN_X = 1620;
const CORRIDOR_TURN_Y = 380;
const ARC_RADIUS = 45;

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
  const approachX = Math.max(220, Math.min(table.cx, AISLE_JOIN_X));
  const verticalLeadY = table.cy > AISLE_Y ? Math.min(table.cy - table.rx - 34, AISLE_Y + 180) : Math.max(table.cy + table.rx + 34, AISLE_Y - 160);

  return {
    path: [
      `M ${entranceX} ${entranceY}`,
      `L ${entranceX} ${CORRIDOR_TURN_Y}`,
      `A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 0 ${AISLE_JOIN_X} ${AISLE_Y}`,
      `L ${approachX} ${AISLE_Y}`,
      `C ${approachX} ${AISLE_Y} ${approachX} ${verticalLeadY} ${approachX} ${verticalLeadY}`,
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

function createOffscreenPath(d: string) {
  const ns = 'http://www.w3.org/2000/svg';
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', d);
  return path;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function centerViewBox(floorplan: FloorPlanData, cx: number, cy: number, width: number, height: number): ViewBoxRect {
  return {
    x: clamp(cx - width / 2, 0, Math.max(0, floorplan.viewBox.width - width)),
    y: clamp(cy - height / 2, 0, Math.max(0, floorplan.viewBox.height - height)),
    width,
    height,
  };
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
  fitToFrame = false,
  onSeatClick,
}: SeatPlanProps) {
  const { t } = useSiteText();
  const [routeSettled, setRouteSettled] = useState(false);
  const [routeVisible, setRouteVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [viewBox, setViewBox] = useState(`0 0 ${floorplan.viewBox.width} ${floorplan.viewBox.height}`);
  const [routeProgress, setRouteProgress] = useState(0);
  const [marker, setMarker] = useState<{ x: number; y: number } | null>(null);
  const viewX = useMotionValue(0);
  const viewY = useMotionValue(0);
  const viewW = useMotionValue(floorplan.viewBox.width);
  const viewH = useMotionValue(floorplan.viewBox.height);
  const progress = useMotionValue(0);
  const rafRef = useRef<number>(0);
  const occupants = buildOccupants(assignments, roster);
  const assignmentCounts = new Map<string, number>();
  const route = useMemo(() => buildWayfindingRoute(floorplan, selectedSeat), [floorplan, selectedSeat]);
  const showRoute = wayfinding && Boolean(route);
  const fullView = useMemo(() => ({
    x: 0,
    y: 0,
    width: floorplan.viewBox.width,
    height: floorplan.viewBox.height,
  }), [floorplan.viewBox.height, floorplan.viewBox.width]);

  const syncViewBox = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setViewBox(`${viewX.get()} ${viewY.get()} ${viewW.get()} ${viewH.get()}`);
    });
  }, [viewH, viewW, viewX, viewY]);

  const animateViewBox = useCallback((rect: ViewBoxRect, duration: number) => {
    animate(viewX, rect.x, { duration, ease: EASE_ELEGANT as never });
    animate(viewY, rect.y, { duration, ease: EASE_ELEGANT as never });
    animate(viewW, rect.width, { duration, ease: EASE_ELEGANT as never });
    animate(viewH, rect.height, { duration, ease: EASE_ELEGANT as never });
  }, [viewH, viewW, viewX, viewY]);

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
    const unsubs = [
      viewX.on('change', syncViewBox),
      viewY.on('change', syncViewBox),
      viewW.on('change', syncViewBox),
      viewH.on('change', syncViewBox),
    ];

    return () => {
      unsubs.forEach((unsubscribe) => unsubscribe());
      cancelAnimationFrame(rafRef.current);
    };
  }, [syncViewBox, viewH, viewW, viewX, viewY]);

  useEffect(() => {
    viewX.set(0);
    viewY.set(0);
    viewW.set(floorplan.viewBox.width);
    viewH.set(floorplan.viewBox.height);
    setViewBox(`0 0 ${floorplan.viewBox.width} ${floorplan.viewBox.height}`);
  }, [floorplan.viewBox.height, floorplan.viewBox.width, viewH, viewW, viewX, viewY]);

  useEffect(() => {
    setRouteSettled(false);
    setRouteVisible(false);
    setRouteProgress(0);
    progress.set(0);

    if (!showRoute || !route) {
      animateViewBox(fullView, reduceMotion ? 0.01 : 0.65);
      setMarker(null);
      return;
    }

    const offscreenPath = createOffscreenPath(route.path);
    const totalLength = offscreenPath.getTotalLength();
    const start = offscreenPath.getPointAtLength(0);
    const end = offscreenPath.getPointAtLength(totalLength);
    setMarker({ x: start.x, y: start.y });

    if (reduceMotion) {
      setRouteVisible(true);
      setRouteProgress(1);
      setMarker({ x: end.x, y: end.y });
      setRouteSettled(true);
      animateViewBox(fullView, 0.01);
      return;
    }

    const followHeight = Math.round(FOLLOW_WIDTH * (floorplan.viewBox.height / floorplan.viewBox.width));
    const entranceView = centerViewBox(floorplan, floorplan.entrance.cx, floorplan.entrance.cy, FOLLOW_WIDTH, followHeight);
    animateViewBox(entranceView, 0.95);

    let unsubscribeProgress: (() => void) | null = null;
    const timers: number[] = [];

    const drawTimer = window.setTimeout(() => {
      setRouteVisible(true);
      unsubscribeProgress = progress.on('change', (value) => {
        setRouteProgress(value);
        const point = offscreenPath.getPointAtLength(value * totalLength);
        setMarker({ x: point.x, y: point.y });
        if (value < 1) {
          const nextView = centerViewBox(floorplan, point.x, point.y, FOLLOW_WIDTH, followHeight);
          viewX.set(nextView.x);
          viewY.set(nextView.y);
          viewW.set(nextView.width);
          viewH.set(nextView.height);
        }
      });

      animate(progress, 1, {
        duration: ROUTE_DRAW_DURATION,
        ease: [0.4, 0, 0.2, 1],
        onComplete: () => {
          unsubscribeProgress?.();
          unsubscribeProgress = null;
          const focusView = centerViewBox(floorplan, route.focusX, route.focusY, 540, Math.round(540 * (floorplan.viewBox.height / floorplan.viewBox.width)));
          animateViewBox(focusView, 1.15);

          const settleTimer = window.setTimeout(() => {
            animateViewBox(fullView, 1.25);
            setRouteSettled(true);
          }, 1650);
          timers.push(settleTimer);
        },
      });
    }, ROUTE_DRAW_DELAY);
    timers.push(drawTimer);

    return () => {
      unsubscribeProgress?.();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [animateViewBox, floorplan, fullView, progress, reduceMotion, route, selectedSeat?.seatNumber, selectedSeat?.tableId, showRoute, viewH, viewW, viewX, viewY]);

  return (
    <div className={`${styles.planFrame} ${showRoute ? styles.planFrameWayfinding : ''} ${fitToFrame ? styles.planFrameFit : ''}`}>
      <svg
        viewBox={viewBox}
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

        <g>
        <rect x="20" y="20" width="1760" height="610" rx="4" className={styles.ballroom} />

        {[380, 660, 940, 1220].map((x) => (
          <rect key={x} x={x} y={622} width={60} height={12} rx={2} className={styles.door} />
        ))}

        <g>
          <rect x={55} y={140} width={120} height={360} rx={6} className={styles.stageBox} />
          <text x={115} y={320} textAnchor="middle" dominantBaseline="central" className={styles.stageText}>
            {t('Stage')}
          </text>
        </g>

        {floorplan.decorations.filter((decoration) => !['Rostrum', 'Wedding\nCake', 'Champagne\nFountain'].includes(decoration.label)).map((decoration, index) => (
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
        {showRoute && route && routeVisible && (
          <g className={styles.routeLayer} aria-hidden="true">
            <motion.path
              key={route.path}
              d={route.path}
              className={styles.routePath}
              filter="url(#route-glow)"
              initial={false}
              animate={{ pathLength: reduceMotion ? 1 : routeProgress, opacity: 1 }}
              transition={{ duration: 0 }}
            />
            {marker && (
              <motion.g
                className={styles.routeMarker}
                animate={{ x: marker.x, y: marker.y }}
                transition={{ duration: 0.08, ease: 'linear' }}
              >
                <circle r={7} />
                {!reduceMotion && !routeSettled && (
                  <motion.circle
                    r={10}
                    className={styles.routeMarkerPulse}
                    animate={{ r: [10, 18, 10], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
              </motion.g>
            )}
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
        </g>
      </svg>
    </div>
  );
}
