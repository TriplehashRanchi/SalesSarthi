'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import {
  Container,
  Group,
  Text,
  Card,
  ScrollArea,
  Table,
  Checkbox,
  Select,
  Button,
  ActionIcon,
  LoadingOverlay,
  Pagination,
  Avatar,
  Menu,
  Paper,
  Transition,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import useTeamRoles from '@/hooks/useTeamRoles';
import { useAuth } from '@/context/AuthContext';
import { presetRange, reportGet } from '@/utils/teamReport';
import { IconTrash, IconEye, IconUsers, IconSearch, IconFilter, IconPhone, IconCheck } from '@tabler/icons-react';

// --- Mobile-First User Card Component ---
// Tap opens the member. Long press starts selecting (then tap toggles); the delete bar appears at the bottom.
const UserCard = ({ user, selected, onToggleSelect, onViewProfile, stat }) => {
  const isSelected = selected.includes(user.id);
  const selecting = selected.length > 0;
  const initials = user.username?.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';
  const overdue = stat ? stat.followups_overdue : 0;

  const timer = React.useRef(null);
  const longPressed = React.useRef(false);
  const startPress = () => {
    longPressed.current = false;
    timer.current = setTimeout(() => {
      longPressed.current = true;
      if (navigator.vibrate) navigator.vibrate(15);
      onToggleSelect(user.id);
    }, 450);
  };
  const cancelPress = () => clearTimeout(timer.current);
  const handleClick = () => {
    if (longPressed.current) { longPressed.current = false; return; }
    if (selecting) onToggleSelect(user.id);
    else onViewProfile(user.id);
  };
  const stop = (e) => e.stopPropagation();

  return (
    <div
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      onTouchCancel={cancelPress}
      onContextMenu={(e) => e.preventDefault()}
      onClick={handleClick}
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
      className={`border-b px-2 py-4 transition active:bg-gray-100/70 dark:active:bg-gray-800/40 ${isSelected ? 'rounded-lg border-transparent bg-blue-50 ring-1 ring-blue-200' : 'border-gray-200 dark:border-gray-700'}`}
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <Avatar color="blue" radius="xl" size={48} src={user.avatar_url || null}>{initials}</Avatar>
          {isSelected && (
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white ring-2 ring-white">
              <IconCheck size={12} stroke={3} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-gray-900 dark:text-white">{user.username}</p>
          <p className="truncate text-xs text-gray-500">{user.phone || user.email}</p>
        </div>
        {!selecting && user.phone && (
          <a href={`tel:${user.phone}`} onClick={stop} onTouchStart={stop} aria-label="Call"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 active:bg-blue-100">
            <IconPhone size={18} />
          </a>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
        <span className="shrink-0 text-xs font-medium text-gray-500">{user.role}</span>

        <p className="flex min-w-0 items-center gap-3 text-xs text-gray-500">
          <span><b className="text-sm font-semibold text-gray-900 dark:text-white">{stat ? stat.leads_assigned : '-'}</b> leads</span>
          <span><b className="text-sm font-semibold text-gray-900 dark:text-white">{stat ? stat.calls : '-'}</b> calls</span>
          <span className={overdue ? 'text-red-500' : ''}><b className={`text-sm font-semibold ${overdue ? '' : 'text-gray-900 dark:text-white'}`}>{stat ? stat.followups_pending : '-'}</b> pending</span>
        </p>
      </div>
    </div>
  );
};


export default function UserListPro() {
  const [users, setUsers] = useState([]);
  const roleNames = useTeamRoles(users.map((u) => u.role));
  const [filtered, setFiltered] = useState([]);
  const [filterRole, setFilterRole] = useState('All Roles');
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});
  const authUser = useAuth()?.user;
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const PAGE_SIZE = 10;

  // fetch users
  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const res = await fetch(`${API_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setUsers(data);
        // Initialize selection state based on fetched users
        setSelected([]);
      } catch (err) {
        showNotification({ title: 'Error', message: err.message, color: 'red' });
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  // quick numbers (last 30 days) shown next to each member
  useEffect(() => {
    if (!authUser) return;
    reportGet('/overview', presetRange('30d'))
      .then((d) => setStats(Object.fromEntries(d.members.map((m) => [m.id, m]))))
      .catch(() => {});
  }, [authUser]);

  // filter & search
  useEffect(() => {
    let list = [...users];
    if (filterRole !== 'All Roles') list = list.filter(u => u.role === filterRole);
    if (searchTerm) {
      list = list.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFiltered(list);
    setPage(1);
    // When filters change, clear selection to avoid confusion
    setSelected([]);
  }, [users, filterRole, searchTerm]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // bulk delete
  const toggleSelect = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };
  
  const toggleSelectAll = () => {
    if (selected.length === paged.length) {
      setSelected([]);
    } else {
      setSelected(paged.map(u => u.id));
    }
  };


  const handleDelete = async (ids) => {
    if (!window.confirm(`Delete ${ids.length} user(s)? This action cannot be undone.`)) return;
    setLoading(true);
    try {
      const auth = getAuth();
      const token = await auth.currentUser.getIdToken();
      await Promise.all(ids.map(id =>
        fetch(`${API_URL}/api/admin/users/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
      ));
      showNotification({ title: 'Deleted', message: `${ids.length} user(s) removed`, color: 'green' });
      // Optimistically update UI
      setUsers(prev => prev.filter(u => !ids.includes(u.id)));
      setSelected([]);
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (id, newRole) => {
    // Prevent no-op updates
    const userToUpdate = users.find(u => u.id === id);
    if (userToUpdate && userToUpdate.role === newRole) return;
    if (!window.confirm(`Are you sure you want to change ${userToUpdate?.username || 'this user'}'s role from ${userToUpdate?.role} to ${newRole}?`)) return;
    
    setLoading(true);
    try {
      const auth = getAuth();
      const token = await auth.currentUser.getIdToken();
      await fetch(`${API_URL}/api/admin/users/${id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole }),
      });
      showNotification({ title: 'Updated', message: 'User role has been changed successfully', color: 'green' });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = (id) => router.push(`/view-user/${id}`);

  return (
    <Container fluid px="xl" pt="md">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            <IconUsers size={24} className="text-blue-600" /> Team Members
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">{filtered.length}</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">Tap a member for their full report. On mobile, long press to select.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
            <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="form-input rounded-xl pl-9" placeholder="Search name or email" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Select data={['All Roles', ...roleNames]} value={filterRole} onChange={setFilterRole} icon={<IconFilter size={15} />} className="w-[140px] shrink-0 sm:w-44" />
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />

        {/* --- Desktop View: Table --- */}
        <Card withBorder radius="md" p={0} shadow="xs" className="hidden md:block">
          <ScrollArea>
            <Table
              miw={1000}
              verticalSpacing="sm"
              highlightOnHover
              sx={{
                'thead th': { fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6b7280', padding: '14px 12px' },
                'tbody td': { padding: '12px', verticalAlign: 'middle' },
                'th:first-of-type, td:first-of-type': { paddingLeft: 28 },
              }}
            >
              <thead>
                <tr>
                  <th style={{ width: 76 }}>
                    <Checkbox
                        checked={selected.length > 0 && selected.length === paged.length}
                        indeterminate={selected.length > 0 && selected.length < paged.length}
                        onChange={toggleSelectAll}
                        aria-label="Select all users on this page"
                    />
                  </th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th style={{ textAlign: 'center' }}>Leads</th>
                  <th style={{ textAlign: 'center' }}>Calls (30d)</th>
                  <th style={{ textAlign: 'center' }}>Pending FU</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(user => (
                  <tr key={user.id} style={{ cursor: 'pointer' }} onClick={() => handleViewProfile(user.id)}>
                    <td onClick={e => e.stopPropagation()}><Checkbox checked={selected.includes(user.id)} onChange={() => toggleSelect(user.id)} /></td>
                    <td>
                      <Group spacing="sm" style={{ cursor: 'pointer' }} onClick={() => handleViewProfile(user.id)}>
                        <Avatar color="blue" radius="xl" src={user.avatar_url || null}>{user.username.split(' ').map(n=>n[0]).join('')}</Avatar>
                        <div>
                          <Text weight={500}>{user.username}</Text>
                          {user.phone && <Text color="dimmed" size="xs">{user.phone}</Text>}
                        </div>
                      </Group>
                    </td>
                    <td><Text color="dimmed">{user.email}</Text></td>
                    <td onClick={e => e.stopPropagation()}>
                      <Select
                        data={roleNames.includes(user.role) ? roleNames : [...roleNames, user.role]}
                        value={user.role}
                        onChange={v => handleRoleChange(user.id, v)}
                        size="xs" sx={{ width: 140 }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>{stats[user.id] ? stats[user.id].leads_assigned : '-'}</td>
                    <td style={{ textAlign: 'center' }}>{stats[user.id] ? stats[user.id].calls : '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      {stats[user.id] ? (
                        <Text size="sm" color={stats[user.id].followups_overdue ? 'red' : undefined} weight={stats[user.id].followups_overdue ? 600 : 400}>{stats[user.id].followups_pending}</Text>
                      ) : '-'}
                    </td>
                    <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <Group spacing="xs" position="center" noWrap>
                        <ActionIcon color="blue" variant="subtle" onClick={() => handleViewProfile(user.id)}><IconEye size={18} /></ActionIcon>
                        <ActionIcon color="red" variant="subtle" onClick={() => handleDelete([user.id])}><IconTrash size={18} /></ActionIcon>
                      </Group>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </ScrollArea>
        </Card>

        {/* --- Mobile View: Cards --- */}
        <div className="md:hidden">
          {paged.length > 0 ? (
            paged.map(user => (
              <UserCard
                key={user.id}
                user={user}
                selected={selected}
                onToggleSelect={toggleSelect}
                onViewProfile={handleViewProfile}
                stat={stats[user.id]}
              />
            ))
          ) : (
            <Text align="center" color="dimmed" p="xl">No users found.</Text>
          )}
        </div>

        {/* --- Common Pagination & Bulk Actions --- */}
        {totalPages > 0 && (
          <Group position="center" py="md">
            <Pagination page={page} onChange={setPage} total={totalPages} />
          </Group>
        )}
      </div>

      {/* --- Mobile Floating Bulk Action Bar --- */}
      <Transition transition="slide-up" mounted={selected.length > 0}>
        {(styles) => (
          <Paper
            style={{ ...styles, position: 'fixed', bottom: 20, left: 20, right: 20, zIndex: 10, maxWidth: 420, margin: '0 auto' }}
            p="sm"
            shadow="md"
            radius="md"
          >
            <Group position="apart">
              <Text weight={500}>{selected.length} selected</Text>
              <Group spacing="xs">
                <Button variant="default" size="xs" onClick={() => setSelected([])}>Cancel</Button>
                <Button color="red" size="xs" onClick={() => handleDelete(selected)}>
                  <IconTrash size={16} style={{ marginRight: '8px' }} />
                  Delete
                </Button>
              </Group>
            </Group>
          </Paper>
        )}
      </Transition>
    </Container>
  );
}
