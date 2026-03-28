import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';

vi.mock('../firebase', () => ({ auth: {}, db: {} }));
vi.mock('firebase/auth', () => ({ onAuthStateChanged: vi.fn(), signOut: vi.fn() }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), getDoc: vi.fn() }));

import { onAuthStateChanged } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useAuth', () => {
  it('starts with loading=true', () => {
    vi.mocked(onAuthStateChanged).mockImplementation(() => () => {});
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
  });

  it('sets user and isAdmin=true when admin doc exists', async () => {
    const mockUser = { uid: 'admin-uid' };
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, cb: any) => {
      cb(mockUser);
      return () => {};
    });
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true } as any);

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBe(mockUser);
    expect(result.current.isAdmin).toBe(true);
  });

  it('sets isAdmin=false when admin doc does not exist', async () => {
    const mockUser = { uid: 'not-admin' };
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, cb: any) => {
      cb(mockUser);
      return () => {};
    });
    vi.mocked(getDoc).mockResolvedValue({ exists: () => false } as any);

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
  });

  it('sets user=null when not authenticated', async () => {
    vi.mocked(onAuthStateChanged).mockImplementation((_auth, cb: any) => {
      cb(null);
      return () => {};
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.isAdmin).toBe(false);
  });
});
