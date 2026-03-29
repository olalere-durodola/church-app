import { useState, useEffect, FormEvent, useCallback } from 'react';
import {
  collection, getDocs, addDoc, deleteDoc, doc, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Department } from '../types/department';
import type { Member } from '../types/member';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [membersByDept, setMembersByDept] = useState<Map<string, Member[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [selectedDept, setSelectedDept] = useState<Department | null>(null);

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, 'departments')),
      getDocs(collection(db, 'members')),
    ])
      .then(([deptSnap, memberSnap]) => {
        const depts = deptSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as Department))
          .sort((a, b) => a.name.localeCompare(b.name));
        setDepartments(depts);

        const byDept = new Map<string, Member[]>();
        memberSnap.docs.forEach(d => {
          const m = { id: d.id, ...d.data() } as Member;
          if (m.department) {
            const list = byDept.get(m.department) ?? [];
            list.push(m);
            byDept.set(m.department, list);
          }
        });
        setMembersByDept(byDept);
      })
      .catch(() => setFetchError('Failed to load departments.'))
      .finally(() => setLoading(false));
  }, []);

  const closeModal = useCallback(() => setSelectedDept(null), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeModal();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeModal]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setAddError(null);

    if (departments.some(d => d.name.toLowerCase() === name.toLowerCase())) {
      setAddError('A department with this name already exists.');
      return;
    }

    setAdding(true);
    try {
      const ref = await addDoc(collection(db, 'departments'), {
        name,
        createdAt: Timestamp.now(),
      });
      const newDept: Department = { id: ref.id, name, createdAt: Timestamp.now() };
      setDepartments(prev =>
        [...prev, newDept].sort((a, b) => a.name.localeCompare(b.name))
      );
      setNewName('');
    } catch {
      setAddError('Failed to add department. Try again.');
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(dept: Department) {
    const count = (membersByDept.get(dept.name) ?? []).length;
    if (count > 0) {
      setDeleteError(`Cannot delete "${dept.name}" — ${count} member${count === 1 ? '' : 's'} currently assigned.`);
      return;
    }
    setDeleteError(null);
    try {
      await deleteDoc(doc(db, 'departments', dept.id));
      setDepartments(prev => prev.filter(d => d.id !== dept.id));
    } catch {
      setDeleteError('Failed to delete department. Try again.');
    }
  }

  if (loading) return <LoadingSpinner />;

  const modalMembers = selectedDept ? (membersByDept.get(selectedDept.name) ?? []) : [];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Departments</h1>
      </div>

      {fetchError && <p className="error-message">{fetchError}</p>}

      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 className="section-title">Add Department</h2>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="deptName">Name</label>
            <input
              id="deptName"
              type="text"
              value={newName}
              onChange={e => { setNewName(e.target.value); setAddError(null); }}
              placeholder="e.g. Choir, Ushers, Youth"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={adding || !newName.trim()}>
            {adding ? 'Adding…' : 'Add'}
          </button>
        </form>
        {addError && <p className="error-message" style={{ marginTop: '0.5rem' }}>{addError}</p>}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {departments.length === 0 ? (
          <p className="empty-state" style={{ padding: '2rem' }}>No departments yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Department</th>
                <th>Members</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {departments.map(dept => {
                const count = (membersByDept.get(dept.name) ?? []).length;
                return (
                  <tr
                    key={dept.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedDept(dept)}
                  >
                    <td>{dept.name}</td>
                    <td>{count}</td>
                    <td style={{ width: '1px', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                      <button
                        className="btn-danger"
                        onClick={() => handleDelete(dept)}
                        disabled={count > 0}
                        title={count > 0 ? `${count} member${count === 1 ? '' : 's'} assigned` : undefined}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {deleteError && <p className="error-message" style={{ marginTop: '1rem' }}>{deleteError}</p>}

      {/* Members modal */}
      {selectedDept && (
        <div className="modal-backdrop" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedDept.name} — {modalMembers.length} member{modalMembers.length !== 1 ? 's' : ''}</h2>
              <button className="modal-close" onClick={closeModal} aria-label="Close">✕</button>
            </div>
            <div className="modal-body">
              {modalMembers.length === 0 ? (
                <p className="modal-empty">No members assigned to this department.</p>
              ) : (
                modalMembers
                  .sort((a, b) => a.fullName.localeCompare(b.fullName))
                  .map(m => (
                    <div key={m.id} className="modal-member-row">
                      <div>
                        <div className="modal-member-name">{m.firstName} {m.lastName}</div>
                        {m.phone && <div className="modal-member-phone">{m.phone}</div>}
                      </div>
                      <StatusBadge status={m.status} />
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
