import { useState, useEffect, FormEvent, useCallback } from 'react';
import {
  collection, getDocs, addDoc, deleteDoc, doc, updateDoc, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Department } from '../types/department';
import type { Member } from '../types/member';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // View overlay
  const [viewDept, setViewDept] = useState<Department | null>(null);

  // Edit modal
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [addMemberId, setAddMemberId] = useState('');
  const [memberOpError, setMemberOpError] = useState<string | null>(null);

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
        const members = memberSnap.docs.map(d => ({ id: d.id, ...d.data() } as Member));
        setAllMembers(members);
      })
      .catch(() => setFetchError('Failed to load departments.'))
      .finally(() => setLoading(false));
  }, []);

  const closeAll = useCallback(() => {
    setViewDept(null);
    setEditDept(null);
    setMemberOpError(null);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeAll();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeAll]);

  // Derived: members in a given department
  function membersOf(deptName: string) {
    return allMembers.filter(m => m.department === deptName)
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  // Derived: members NOT in the given department (available to add)
  function availableMembers(deptName: string) {
    return allMembers
      .filter(m => m.department !== deptName)
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  async function handleAddMember() {
    if (!editDept || !addMemberId) return;
    setMemberOpError(null);
    try {
      await updateDoc(doc(db, 'members', addMemberId), { department: editDept.name });
      setAllMembers(prev =>
        prev.map(m => m.id === addMemberId ? { ...m, department: editDept.name } : m)
      );
      setAddMemberId('');
    } catch {
      setMemberOpError('Failed to add member. Try again.');
    }
  }

  async function handleRemoveMember(memberId: string) {
    setMemberOpError(null);
    try {
      await updateDoc(doc(db, 'members', memberId), { department: null });
      setAllMembers(prev =>
        prev.map(m => m.id === memberId ? { ...m, department: null } : m)
      );
    } catch {
      setMemberOpError('Failed to remove member. Try again.');
    }
  }

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
    const count = membersOf(dept.name).length;
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

  const viewMembers = viewDept ? membersOf(viewDept.name) : [];
  const editMembers = editDept ? membersOf(editDept.name) : [];
  const available = editDept ? availableMembers(editDept.name) : [];

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
                const count = membersOf(dept.name).length;
                return (
                  <tr
                    key={dept.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setViewDept(dept)}
                  >
                    <td>{dept.name}</td>
                    <td>{count}</td>
                    <td
                      style={{ width: '1px', whiteSpace: 'nowrap' }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn-secondary"
                          onClick={() => { setEditDept(dept); setAddMemberId(''); setMemberOpError(null); }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-danger"
                          onClick={() => handleDelete(dept)}
                          disabled={count > 0}
                          title={count > 0 ? `${count} member${count === 1 ? '' : 's'} assigned` : undefined}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {deleteError && <p className="error-message" style={{ marginTop: '1rem' }}>{deleteError}</p>}

      {/* View overlay */}
      {viewDept && (
        <div className="modal-backdrop" onClick={closeAll} role="dialog" aria-modal="true">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{viewDept.name} — {viewMembers.length} member{viewMembers.length !== 1 ? 's' : ''}</h2>
              <button className="modal-close" onClick={closeAll} aria-label="Close">✕</button>
            </div>
            <div className="modal-body">
              {viewMembers.length === 0 ? (
                <p className="modal-empty">No members assigned to this department.</p>
              ) : (
                viewMembers.map(m => (
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

      {/* Edit modal */}
      {editDept && (
        <div className="modal-backdrop" onClick={closeAll} role="dialog" aria-modal="true">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit — {editDept.name}</h2>
              <button className="modal-close" onClick={closeAll} aria-label="Close">✕</button>
            </div>
            <div className="modal-body">
              {/* Add member row */}
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ fontSize: '0.78rem' }}>Add member</label>
                  <select value={addMemberId} onChange={e => setAddMemberId(e.target.value)}>
                    <option value="">— Select member —</option>
                    {available.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName}{m.department ? ` (${m.department})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className="btn-primary"
                  onClick={handleAddMember}
                  disabled={!addMemberId}
                >
                  Add
                </button>
              </div>

              {memberOpError && (
                <p className="error-message" style={{ padding: '0.5rem 1.5rem', margin: 0 }}>{memberOpError}</p>
              )}

              {/* Current members */}
              {editMembers.length === 0 ? (
                <p className="modal-empty">No members yet. Add one above.</p>
              ) : (
                editMembers.map(m => (
                  <div key={m.id} className="modal-member-row">
                    <div>
                      <div className="modal-member-name">{m.firstName} {m.lastName}</div>
                      {m.phone && <div className="modal-member-phone">{m.phone}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <StatusBadge status={m.status} />
                      <button
                        className="btn-danger"
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.78rem' }}
                        onClick={() => handleRemoveMember(m.id)}
                      >
                        Remove
                      </button>
                    </div>
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
