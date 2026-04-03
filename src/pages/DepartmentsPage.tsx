import { useState, useEffect, FormEvent, useCallback } from 'react';
import {
  collection, getDocs, addDoc, deleteDoc, doc, updateDoc, writeBatch, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Department } from '../types/department';
import type { Member } from '../types/member';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import MemberAvatar from '../components/MemberAvatar';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDeleteDept, setConfirmDeleteDept] = useState<Department | null>(null);

  // View overlay
  const [viewDept, setViewDept] = useState<Department | null>(null);

  // Edit modal
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [addMemberId, setAddMemberId] = useState('');
  const [memberOpError, setMemberOpError] = useState<string | null>(null);

  // Add Members overlay
  const [addMembersDept, setAddMembersDept] = useState<Department | null>(null);
  const [memberSearch, setMemberSearch] = useState('');

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
    setAddMembersDept(null);
    setMemberSearch('');
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
    return allMembers.filter(m => (m.departments ?? []).includes(deptName))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  function availableMembers(deptName: string) {
    return allMembers
      .filter(m => !(m.departments ?? []).includes(deptName))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  async function handleAddMember() {
    if (!editDept || !addMemberId) return;
    setMemberOpError(null);
    try {
      const target = allMembers.find(m => m.id === addMemberId);
      const updated = [...(target?.departments ?? []).filter(d => d !== editDept.name), editDept.name];
      await updateDoc(doc(db, 'members', addMemberId), { departments: updated });
      setAllMembers(prev =>
        prev.map(m => m.id === addMemberId ? { ...m, departments: updated } : m)
      );
      setAddMemberId('');
    } catch {
      setMemberOpError('Failed to add member. Try again.');
    }
  }

  async function handleRemoveMember(memberId: string, deptName: string) {
    setMemberOpError(null);
    try {
      const target = allMembers.find(m => m.id === memberId);
      const updated = (target?.departments ?? []).filter(d => d !== deptName);
      await updateDoc(doc(db, 'members', memberId), { departments: updated });
      setAllMembers(prev =>
        prev.map(m => m.id === memberId ? { ...m, departments: updated } : m)
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
    setDeleteError(null);
    try {
      const affected = membersOf(dept.name);
      if (affected.length > 0) {
        const batch = writeBatch(db);
        affected.forEach(m => {
          batch.update(doc(db, 'members', m.id), {
            departments: (m.departments ?? []).filter(d => d !== dept.name),
          });
        });
        await batch.commit();
        setAllMembers(prev =>
          prev.map(m => affected.some(a => a.id === m.id)
            ? { ...m, departments: (m.departments ?? []).filter(d => d !== dept.name) }
            : m
          )
        );
      }
      await deleteDoc(doc(db, 'departments', dept.id));
      setDepartments(prev => prev.filter(d => d.id !== dept.id));
    } catch {
      setDeleteError('Failed to delete department. Try again.');
    } finally {
      setConfirmDeleteDept(null);
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
                          className="btn-primary"
                          onClick={() => { setAddMembersDept(dept); setMemberSearch(''); }}
                        >
                          Add Member
                        </button>
                        <button
                          className="btn-danger"
                          onClick={() => setConfirmDeleteDept(dept)}
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

      {/* Delete confirmation modal */}
      {confirmDeleteDept && (() => {
        const count = membersOf(confirmDeleteDept.name).length;
        return (
          <div className="modal-backdrop" onClick={() => setConfirmDeleteDept(null)} role="dialog" aria-modal="true">
            <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Delete "{confirmDeleteDept.name}"?</h2>
                <button className="modal-close" onClick={() => setConfirmDeleteDept(null)} aria-label="Close">✕</button>
              </div>
              <div style={{ padding: '1.25rem 1.5rem' }}>
                {count > 0 ? (
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                    This department has <strong style={{ color: 'var(--color-text-primary)' }}>{count} member{count !== 1 ? 's' : ''}</strong> assigned.
                    They will be removed from this department but not deleted.
                  </p>
                ) : (
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                    This will permanently delete the department. This cannot be undone.
                  </p>
                )}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button className="btn-secondary" autoFocus onClick={() => setConfirmDeleteDept(null)}>Cancel</button>
                  <button className="btn-danger" onClick={() => handleDelete(confirmDeleteDept)}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <MemberAvatar photoURL={m.photoURL} firstName={m.firstName} lastName={m.lastName} size="sm" />
                      <div>
                        <div className="modal-member-name">{m.firstName} {m.lastName}</div>
                        {m.phone && <div className="modal-member-phone">{m.phone}</div>}
                      </div>
                    </div>
                    <StatusBadge status={m.status} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Members overlay */}
      {addMembersDept && (() => {
        const filtered = allMembers
          .filter(m => {
            const inDept = (m.departments ?? []).includes(addMembersDept.name);
            if (inDept) return false;
            if (!memberSearch.trim()) return true;
            return m.fullName.toLowerCase().includes(memberSearch.trim().toLowerCase());
          })
          .sort((a, b) => a.fullName.localeCompare(b.fullName));
        const inDept = membersOf(addMembersDept.name);
        return (
          <div className="modal-backdrop" onClick={closeAll} role="dialog" aria-modal="true">
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Add Member — {addMembersDept.name}</h2>
                <button className="modal-close" onClick={closeAll} aria-label="Close">✕</button>
              </div>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
                <input
                  type="text"
                  placeholder="Search by name…"
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  autoFocus
                  style={{ width: '100%' }}
                />
              </div>
              {inDept.length > 0 && (
                <div style={{ padding: '0.5rem 1.5rem', fontSize: '0.78rem', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                  Already in department: {inDept.map(m => m.firstName + ' ' + m.lastName).join(', ')}
                </div>
              )}
              <div className="modal-body">
                {filtered.length === 0 ? (
                  <p className="modal-empty">{memberSearch.trim() ? 'No members match your search.' : 'All members are already in this department.'}</p>
                ) : (
                  filtered.map(m => (
                    <div key={m.id} className="modal-member-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <MemberAvatar photoURL={m.photoURL} firstName={m.firstName} lastName={m.lastName} size="sm" />
                        <div>
                          <div className="modal-member-name">{m.firstName} {m.lastName}</div>
                          {m.departments && m.departments.length > 0 && (
                            <div className="modal-member-phone">{m.departments.join(', ')}</div>
                          )}
                        </div>
                      </div>
                      <button
                        className="btn-primary"
                        style={{ padding: '0.2rem 0.75rem', fontSize: '0.78rem' }}
                        onClick={async () => {
                          const updated = [...(m.departments ?? []), addMembersDept.name];
                          try {
                            await updateDoc(doc(db, 'members', m.id), { departments: updated });
                            setAllMembers(prev =>
                              prev.map(x => x.id === m.id ? { ...x, departments: updated } : x)
                            );
                          } catch {
                            // silently ignore; user can retry
                          }
                        }}
                      >
                        Add
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}

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
                        {m.firstName} {m.lastName}{m.departments?.length ? ` (${m.departments.join(', ')})` : ''}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <MemberAvatar photoURL={m.photoURL} firstName={m.firstName} lastName={m.lastName} size="sm" />
                      <div>
                        <div className="modal-member-name">{m.firstName} {m.lastName}</div>
                        {m.phone && <div className="modal-member-phone">{m.phone}</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <StatusBadge status={m.status} />
                      <button
                        className="btn-danger"
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.78rem' }}
                        onClick={() => handleRemoveMember(m.id, editDept!.name)}
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
