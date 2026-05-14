'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SeatPlan from '@/components/seating/SeatPlan';
import type { FloorPlanData, SeatingAssignment, SeatingPerson } from '@/lib/seatingTypes';
import { useSiteText } from '@/lib/sitePreferences';
import styles from './page.module.css';

interface SearchResult {
  personId: string;
  displayName: string;
  tableId: string;
  tableLabel: string;
  seatNumber: number;
  tablemates?: SearchResult[];
}

export default function SeatingPage() {
  const { t } = useSiteText();
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
      ? [
          { personId: selected.personId, tableId: selected.tableId, seatNumber: selected.seatNumber },
          ...(selected.tablemates || []).map((mate) => ({
            personId: mate.personId,
            tableId: mate.tableId,
            seatNumber: mate.seatNumber,
          })),
        ]
      : []
  ), [selected]);

  const publicRoster: SeatingPerson[] = useMemo(() => (
    selected
      ? [
          {
            id: selected.personId,
            displayName: selected.displayName,
            firstName: selected.displayName.split(/\s+/)[0] || selected.displayName,
            source: 'rsvp',
          },
          ...(selected.tablemates || []).map((mate) => ({
            id: mate.personId,
            displayName: mate.displayName,
            firstName: mate.displayName.split(/\s+/)[0] || mate.displayName,
            source: 'rsvp' as const,
          })),
        ]
      : []
  ), [selected]);

  const showNoResults = query.trim().length >= 2 && !searching && results.length === 0;

  return (
    <main className={styles.page}>
      <Link href="/" className={styles.backLink} aria-label={t('Back to main page')}>
        <span aria-hidden="true">&larr;</span>
        {t('Back to main page')}
      </Link>
      <section className={styles.hero}>
        <div className={styles.copy}>
          <span className={styles.eyebrow}>{t('The Westin Singapore')}</span>
          <h1>{t('Find Your Dinner Seat')}</h1>
          <p>{t('Search your name to see your table and seat for the reception.')}</p>
        </div>

        <div className={styles.searchPanel}>
          <label htmlFor="seat-search">{t('Guest name')}</label>
          <div className={styles.searchBox}>
            <input
              id="seat-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('Start typing your name...')}
              autoComplete="off"
            />
            {searching && <span>{t('Searching...')}</span>}
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
                    <span>{t('Table {table}, seat {seat}.', { table: result.tableLabel, seat: result.seatNumber })}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {showNoResults && (
            <p className={styles.noResults}>{t('No assigned seat found yet. Please check your spelling or ask the welcome team.')}</p>
          )}
        </div>
      </section>

      {error && <p className={styles.error}>{t(error)}</p>}
      {loadingPlan && <p className={styles.loading}>{t('Loading seating plan...')}</p>}

      {floorplan && (
        <section className={styles.planSection}>
          <div className={styles.planHeader}>
            {selected ? (
              <div>
                <span className={styles.eyebrow}>{t('Your seat assignment')}</span>
                <h2>{selected.displayName}</h2>
                <p>
                  {t('Table {table}, seat {seat}. Enter from the bottom-right entrance and follow the aisle toward your highlighted table.', { table: selected.tableLabel, seat: selected.seatNumber })}
                </p>
              </div>
            ) : (
              <div>
                <span className={styles.eyebrow}>{t('Reception layout')}</span>
                <h2>{t('Grand Ballroom')}</h2>
                <p>{t('Your table will highlight here after you choose your search result.')}</p>
              </div>
            )}

            {selected && (
              <button type="button" className={styles.secondaryButton} onClick={() => setSelected(null)}>
                {t('Back to results')}
              </button>
            )}
          </div>

          <div className={`${styles.planLayout} ${selected ? styles.planLayoutWithSidebar : ''}`}>
            <SeatPlan
              floorplan={floorplan}
              assignments={publicAssignment}
              roster={publicRoster}
              selectedPersonId={selected?.personId}
              selectedSeat={selected ? { tableId: selected.tableId, seatNumber: selected.seatNumber } : null}
              wayfinding={Boolean(selected)}
              readonly
            />

            {selected && (
              <aside className={styles.tablemates} aria-label={t('Guests at your table')}>
                <span className={styles.eyebrow}>{t('Guests at your table')}</span>
                <h3>{t('Table {table}', { table: selected.tableLabel })}</h3>
                <ul>
                  <li className={styles.currentGuest}>
                    <strong>{selected.displayName}</strong>
                    <span>{t('Seat {seat}', { seat: selected.seatNumber })}</span>
                  </li>
                  {(selected.tablemates || []).map((mate) => (
                    <li key={mate.personId}>
                      <strong>{mate.displayName}</strong>
                      <span>{t('Seat {seat}', { seat: mate.seatNumber })}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
