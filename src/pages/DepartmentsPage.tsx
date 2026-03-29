import { useState, useEffect, FormEvent } from 'react';
import {
  collection, getDocs, addDoc, deleteDoc, doc, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Department } from '../types/department';
import LoadingSpinner from '../components/LoadingSpinner';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [memberCounts, setMemberCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

        const counts = new Map<string, number>();
        memberSnap.docs.forEach(d => {
          const dept = d.data().department as string | null;
          if (dept) counts.set(dept, (counts.get(dept) ?? 0) + 1);
        });
        setMemberCounts(counts);
      })
      .catch(() => setFetchError('Failed to load departments.'))
      .finally(() => setLoading(false));
  }, []);

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
    const count = memberCounts.get(dept.name) ?? 0;
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
                const count = memberCounts.get(dept.name) ?? 0;
                return (
                  <tr key={dept.id}>
                    <td>{dept.name}</td>
                    <td>{count}</td>
                    <td style={{ width: '1px', whiteSpace: 'nowrap' }}>
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
    </div>
  );
}
