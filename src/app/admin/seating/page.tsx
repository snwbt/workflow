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

function tableSortValue(labelOrId?: string) {
  const value = String(labelOrId || '');
  const numeric = Number(value.replace(/[^\d.]/g, ''));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : Number.MAX_SAFE_INTEGER;
}

export default function AdminSeatingPage() {
  const [payload, setPayload] = useState<SeatingPayload | null>(null);
  const [assignments, setAssignments] = useState<SeatingAssignment[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [filter, setFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
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

  const fullRoster = useMemo(() => (payload ? payload.roster : []), [payload]);
  const roster = useMemo(() => fullRoster.filter((person) => person.source !== 'guest'), [fullRoster]);
  const selectedPerson = roster.find((person) => person.id === selectedPersonId) || null;
  const personById = useMemo(() => new Map(fullRoster.map((person) => [person.id, person])), [fullRoster]);
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

  const tablesById = useMemo(() => new Map((payload?.floorplan.tables || []).map((table) => [table.id, table])), [payload]);

  const visibleRoster = roster
    .filter((person) => {
      const assigned = assignmentByPerson.has(person.id);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'assigned' && assigned) ||
        (filter === 'unassigned' && !assigned);
      const searchText = [person.displayName, person.dietary, person.accessibility, sourceLabel(person.source)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = searchText.includes(search.toLowerCase().trim());
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      const assignmentA = assignmentByPerson.get(a.id);
      const assignmentB = assignmentByPerson.get(b.id);

      if (assignmentA && assignmentB) {
        const tableA = tablesById.get(assignmentA.tableId);
        const tableB = tablesById.get(assignmentB.tableId);
        const tableDiff = tableSortValue(tableA?.label || assignmentA.tableId) - tableSortValue(tableB?.label || assignmentB.tableId);
        if (tableDiff !== 0) return tableDiff;
        return assignmentA.seatNumber - assignmentB.seatNumber;
      }

      if (assignmentA) return -1;
      if (assignmentB) return 1;
      return a.displayName.localeCompare(b.displayName);
    });

  const persistAssignments = async (nextAssignments: SeatingAssignment[], successMessage: string) => {
    const previousAssignments = assignments;
    setAssignments(nextAssignments);
    setSaving(true);
    setSaveState('idle');
    setError('');
    setMessage('Saving...');

    try {
      const res = await fetch('/api/admin/seating', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments: nextAssignments }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save seating assignments.');
      }

      setSaveState('saved');
      setMessage(successMessage);
    } catch (err) {
      setAssignments(previousAssignments);
      setSaveState('error');
      setError(err instanceof Error ? err.message : 'Failed to save seating assignments.');
    } finally {
      setSaving(false);
    }
  };

  const handleSeatClick = (tableId: string, seatNumber: number) => {
    setMessage('');
    setError('');
    const seatKey = `${tableId}:${seatNumber}`;
    const occupied = assignmentBySeat.get(seatKey);

    if (!selectedPersonId) {
      if (occupied) {
        if (roster.some((person) => person.id === occupied.personId)) {
          setSelectedPersonId(occupied.personId);
        } else {
          const occupant = personById.get(occupied.personId);
          setError(`This seat is already assigned to ${occupant?.displayName || 'another guest'}.`);
        }
      }
      return;
    }

    if (occupied && occupied.personId !== selectedPersonId) {
      const occupant = personById.get(occupied.personId);
      setError(`Table seat is already assigned to ${occupant?.displayName || 'another guest'}. Clear that guest first.`);
      return;
    }

    const nextAssignments = [
      ...assignments.filter((assignment) => assignment.personId !== selectedPersonId),
      {
        personId: selectedPersonId,
        tableId,
        seatNumber,
        updatedAt: new Date().toISOString(),
      },
    ];

    void persistAssignments(nextAssignments, 'Assignment saved.');
  };

  const clearAssignment = (personId: string) => {
    const assignment = assignmentByPerson.get(personId);
    if (!assignment) return;
    const nextAssignments = assignments.filter((item) => item.personId !== personId);
    if (selectedPersonId === personId) setSelectedPersonId(personId);
    void persistAssignments(nextAssignments, 'Assignment cleared.');
  };

  if (loading && !payload) return <div className={styles.container}>Loading seating planner...</div>;
  if (error && !payload) return <div className={styles.container} style={{ color: 'var(--color-error)' }}>{error}</div>;
  if (!payload) return <div className={styles.container}>No seating data available.</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Seating Plan</h1>
          <p className={styles.subtitle}>Assign dinner RSVP guests to the Westin Grand Ballroom floorplan. Changes auto-save as you work.</p>
        </div>
        <div className={`${styles.saveStatus} ${saveState === 'error' ? styles.saveStatusError : ''}`} aria-live="polite">
          {saving ? 'Saving...' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Save failed' : 'Autosave ready'}
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span>Total seats</span>
          <strong>{payload.summary.totalSeats}</strong>
        </div>
        <div className={styles.statCard}>
          <span>Assignable guests</span>
          <strong>{roster.length}</strong>
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
            roster={fullRoster}
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
                <button className={styles.secondaryButton} onClick={() => clearAssignment(selectedPerson.id)} disabled={!selectedAssignment || saving}>
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

          <div className={styles.assignmentTableWrap}>
            <table className={styles.assignmentTable}>
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>Table</th>
                  <th>Seat</th>
                  <th>Status</th>
                  <th><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
            {visibleRoster.map((person) => {
              const assignment = assignmentByPerson.get(person.id);
              const table = assignment ? tablesById.get(assignment.tableId) : null;
              return (
                <tr
                  key={person.id}
                  className={selectedPersonId === person.id ? styles.rowActive : ''}
                  onClick={() => setSelectedPersonId(person.id)}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedPersonId(person.id);
                    }
                  }}
                >
                  <td>
                    <strong>{person.displayName}</strong>
                    <small>{sourceLabel(person.source)}{person.dietary ? ` | ${person.dietary}` : ''}</small>
                  </td>
                  <td>{assignment ? table?.label || assignment.tableId : '-'}</td>
                  <td>{assignment ? assignment.seatNumber : '-'}</td>
                  <td>
                    <span className={assignment ? styles.statusAssigned : styles.statusUnassigned}>
                      {assignment ? 'Assigned' : 'Unassigned'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.clearButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        clearAssignment(person.id);
                      }}
                      disabled={!assignment || saving}
                    >
                      Clear
                    </button>
                  </td>
                </tr>
              );
            })}
              </tbody>
            </table>
          </div>
        </aside>
      </div>
    </div>
  );
}
