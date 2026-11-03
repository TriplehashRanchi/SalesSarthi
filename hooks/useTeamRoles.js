'use client';
import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Role names the super admin has made available. `extra` keeps a member's current
// role selectable even if that role was later deactivated.
export default function useTeamRoles(extra = []) {
  const [names, setNames] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = getAuth().currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const res = await fetch(`${API_URL}/api/admin/roles`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setNames(data.map((r) => r.name));
      } catch {
        /* the dropdown simply stays limited to the current roles */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return [...new Set([...names, ...extra.filter(Boolean)])];
}
