'use client';

import { useEffect, useMemo, useState } from 'react';
import SeatPlan from '@/components/seating/SeatPlan';
import type { FloorPlanData, SeatingAssignment, SeatingConflict, SeatingPerson } from '@/lib/seatingTypes';
import styles from './page.module.css';

interface SeatingPayload {
  floorplan: FloorPlanData;
  assignments: SeatingAssignment[];
  roster: SeatingPerson[];
  conflicts: SeatingConflict[];
  summary: {
    totalSeats: number;
    totalPeople: number;
    assignedPeople: number;
  };
}

function sourceLabel(source: SeatingPerson['source']) {
  if (source === 'guest') return 'Imported';
  if (source === 'placeholder') return 'Placeholder';
  return 'RSVP';
}

export default function AdminSeatingPage() {
  const [payload, setPayload] = useState<SeatingPayload | null>(null);
  const [assignments, setAssignments] = useState<SeatingAssignment[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [filter, setFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchSeating = () => {
    setLoading(true);
    setError('');
    fetch('/api/admin/seating')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: SeatingPayload) => {
        setPayload(data);
        setAssignments(data.assignments || []);
      })
      .catch((err) => setError(`Failed to load seating planner: ${err.message}`))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void Promise.resolve().then(fetchSeating);
  }, []);

  const roster = useMemo(() => (payload ? payload.roster : []), [payload]);
  const selectedPerson = roster.find((person) => person.id === selectedPersonId) || null;
  const personById = useMemo(() => new Map(roster.map((person) => [person.id, person])), [roster]);
  const assignmentByPerson = useMemo(
    () => new Map(assignments.map((assignment) => [assignment.personId, assignment])),
    [assignments]
  );
  const assignmentBySeat = useMemo(
    () => new Map(assignments.map((assignment) => [`${assignment.tableId}:${assignment.seatNumber}`, assignment])),
    [assignments]
  );

  const selectedAssignment = selectedPersonId ? assignmentByPerson.get(selectedPersonId) : null;
  const assignedCount = roster.filter((person) => assignmentByPerson.has(person.id)).length;

  const visibleRoster = roster.filter((person) => {
    const assigned = assignmentByPerson.has(person.id);
    const matchesFilter =
      filter === 'all' ||
      (filter === 'assigned' && assigned) ||
      (filter === 'unassigned' && !assigned);
    const matchesSearch = person.displayName.toLowerCase().includes(search.toLowerCase().trim());
    return matchesFilter && matchesSearch;
  });

  const handleSeatClick = (tableId: string, seatNumber: number) => {
    setMessage('');
    setError('');
    const seatKey = `${tableId}:${seatNumber}`;
    const occupied = assignmentBySeat.get(seatKey);

    if (!selectedPersonId) {
      if (occupied) setSelectedPersonId(occupied.personId);
      return;
    }

    if (occupied && occupied.personId !== selectedPersonId) {
      const occupant = personById.get(occupied.personId);
      setError(`Table seat is already assigned to ${occupant?.displayName || 'another guest'}. Clear that guest first.`);
      return;
    }

    setAssignments((current) => [
      ...current.filter((assignment) => assignment.personId !== selectedPersonId),
      {
        personId: selectedPersonId,
        tableId,
        seatNumber,
        updatedAt: new Date().toISOString(),
      },
    ]);
  };

  const clearSelectedAssignment = () => {
    if (!selectedPersonId) return;
    setAssignments((current) => current.filter((assignment) => assignment.personId !== selectedPersonId));
    setMessage('Assignment cleared locally. Save changes to persist it.');
  };

  const saveAssignments = async () => {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/seating', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save seating assignments.');
      }

      setMessage('Seating assignments saved.');
      fetchSeating();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save seating assignments.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !payload) return <div className={styles.container}>Loading seating planner...</div>;
  if (error && !payload) return <div className={styles.container} style={{ color: 'var(--color-error)' }}>{error}</div>;
  if (!payload) return <div className={styles.container}>No seating data available.</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Seating Plan</h1>
          <p className={styles.subtitle}>Assign dinner guests to the Westin Grand Ballroom floorplan.</p>
        </div>
        <button className={styles.primaryButton} onClick={saveAssignments} disabled={saving}>
          {saving ? 'Saving...' : 'Save assignments'}
        </button>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span>Total seats</span>
          <strong>{payload.summary.totalSeats}</strong>
        </div>
        <div className={styles.statCard}>
          <span>Assignable guests</span>
          <strong>{payload.summary.totalPeople}</strong>
        </div>
        <div className={styles.statCard}>
          <span>Assigned</span>
          <strong>{assignedCount}</strong>
        </div>
      </div>

      {(message || error || payload.conflicts.length > 0) && (
        <div className={`${styles.notice} ${error || payload.conflicts.length > 0 ? styles.noticeError : styles.noticeSuccess}`}>
          {message && <p>{message}</p>}
          {error && <p>{error}</p>}
          {payload.conflicts.map((conflict, index) => (
            <p key={`${conflict.type}-${index}`}>{conflict.message}</p>
          ))}
        </div>
      )}

      <div className={styles.workspace}>
        <section className={styles.planPanel} aria-label="Venue seatplan">
          <SeatPlan
            floorplan={payload.floorplan}
            assignments={assignments}
            roster={roster}
            selectedPersonId={selectedPersonId}
            selectedSeat={selectedAssignment ? { tableId: selectedAssignment.tableId, seatNumber: selectedAssignment.seatNumber } : null}
            showOccupants
            onSeatClick={handleSeatClick}
          />
        </section>

        <aside className={styles.rosterPanel}>
          <div className={styles.selectedCard}>
            <span className={styles.kicker}>Selected</span>
            {selectedPerson ? (
              <>
                <strong>{selectedPerson.displayName}</strong>
                <small>
                  {selectedAssignment
                    ? `Table ${payload.floorplan.tables.find((table) => table.id === selectedAssignment.tableId)?.label || selectedAssignment.tableId}, seat ${selectedAssignment.seatNumber}`
                    : 'No seat assigned'}
                </small>
                {(selectedPerson.dietary || selectedPerson.accessibility) && (
                  <p>{[selectedPerson.dietary, selectedPerson.accessibility].filter(Boolean).join(' | ')}</p>
                )}
                <button className={styles.secondaryButton} onClick={clearSelectedAssignment} disabled={!selectedAssignment}>
                  Clear assignment
                </button>
              </>
            ) : (
              <p>Choose a guest, then click an empty seat.</p>
            )}
          </div>

          <div className={styles.controls}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search guests..."
              className={styles.searchInput}
            />
            <div className={styles.segmented}>
              {(['all', 'unassigned', 'assigned'] as const).map((value) => (
                <button
                  key={value}
                  className={filter === value ? styles.segmentActive : ''}
                  onClick={() => setFilter(value)}
                  type="button"
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.rosterList}>
            {visibleRoster.map((person) => {
              const assignment = assignmentByPerson.get(person.id);
              const table = assignment ? payload.floorplan.tables.find((item) => item.id === assignment.tableId) : null;
              return (
                <button
                  key={person.id}
                  type="button"
                  className={`${styles.rosterItem} ${selectedPersonId === person.id ? styles.rosterItemActive : ''}`}
                  onClick={() => setSelectedPersonId(person.id)}
                >
                  <span>
                    <strong>{person.displayName}</strong>
                    <small>{sourceLabel(person.source)}{person.dietary ? ` | ${person.dietary}` : ''}</small>
                  </span>
                  <em>{assignment ? `T${table?.label || assignment.tableId} S${assignment.seatNumber}` : 'Unassigned'}</em>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
