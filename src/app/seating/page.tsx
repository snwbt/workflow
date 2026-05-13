'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SeatPlan from '@/components/seating/SeatPlan';
import type { FloorPlanData, SeatingAssignment, SeatingPerson } from '@/lib/seatingTypes';
import styles from './page.module.css';

interface SearchResult {
  personId: string;
  displayName: string;
  tableId: string;
  tableLabel: string;
  seatNumber: number;
}

export default function SeatingPage() {
  const [floorplan, setFloorplan] = useState<FloorPlanData | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/seating/floorplan')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setFloorplan(data.floorplan))
      .catch(() => setError('We could not load the seating plan just now.'))
      .finally(() => setLoadingPlan(false));
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    setSelected(null);

    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      fetch('/api/seating/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => setResults(Array.isArray(data.results) ? data.results : []))
        .catch((err) => {
          if (err.name !== 'AbortError') setResults([]);
        })
        .finally(() => setSearching(false));
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const publicAssignment: SeatingAssignment[] = useMemo(() => (
    selected
      ? [{ personId: selected.personId, tableId: selected.tableId, seatNumber: selected.seatNumber }]
      : []
  ), [selected]);

  const publicRoster: SeatingPerson[] = useMemo(() => (
    selected
      ? [{
          id: selected.personId,
          displayName: selected.displayName,
          firstName: selected.displayName.split(/\s+/)[0] || selected.displayName,
          source: 'rsvp',
        }]
      : []
  ), [selected]);

  const showNoResults = query.trim().length >= 2 && !searching && results.length === 0;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.copy}>
          <span className={styles.eyebrow}>The Westin Singapore</span>
          <h1>Find Your Dinner Seat</h1>
          <p>Search your name to see your table and seat for the reception.</p>
        </div>

        <div className={styles.searchPanel}>
          <label htmlFor="seat-search">Guest name</label>
          <div className={styles.searchBox}>
            <input
              id="seat-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Start typing your name..."
              autoComplete="off"
            />
            {searching && <span>Searching...</span>}
          </div>

          <AnimatePresence>
            {results.length > 0 && !selected && (
              <motion.div
                className={styles.results}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                {results.map((result) => (
                  <button key={result.personId} type="button" onClick={() => setSelected(result)}>
                    <strong>{result.displayName}</strong>
                    <span>Table {result.tableLabel}, seat {result.seatNumber}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {showNoResults && (
            <p className={styles.noResults}>No assigned seat found yet. Please check your spelling or ask the welcome team.</p>
          )}
        </div>
      </section>

      {error && <p className={styles.error}>{error}</p>}
      {loadingPlan && <p className={styles.loading}>Loading seating plan...</p>}

      {floorplan && (
        <section className={styles.planSection}>
          <div className={styles.planHeader}>
            {selected ? (
              <div>
                <span className={styles.eyebrow}>Your seat assignment</span>
                <h2>{selected.displayName}</h2>
                <p>
                  Table {selected.tableLabel}, seat {selected.seatNumber}. Enter from the bottom-right entrance and follow the aisle toward your highlighted table.
                </p>
              </div>
            ) : (
              <div>
                <span className={styles.eyebrow}>Reception layout</span>
                <h2>Grand Ballroom</h2>
                <p>Your table will highlight here after you choose your search result.</p>
              </div>
            )}

            {selected && (
              <button type="button" className={styles.secondaryButton} onClick={() => setSelected(null)}>
                Back to results
              </button>
            )}
          </div>

          <SeatPlan
            floorplan={floorplan}
            assignments={publicAssignment}
            roster={publicRoster}
            selectedPersonId={selected?.personId}
            selectedSeat={selected ? { tableId: selected.tableId, seatNumber: selected.seatNumber } : null}
            readonly
          />
        </section>
      )}
    </main>
  );
}
