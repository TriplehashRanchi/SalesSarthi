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
  TextInput,
  Button,
  ActionIcon,
  LoadingOverlay,
  Pagination,
  Avatar,
  Menu,
  Paper,
  Transition,
  Modal, // Added for mobile filters
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { IconTrash, IconEye, IconUsers, IconSearch, IconFilter, IconDotsVertical } from '@tabler/icons-react';

// --- Mobile-First User Card Component ---
const UserCard = ({ user, selected, onToggleSelect, onRoleChange, onDelete, onViewProfile }) => {
  const isSelected = selected.includes(user.id);
  const initials = user.username?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

  return (
    <Paper withBorder p="sm" radius="md" style={{ position: 'relative' }}>
      <Group noWrap position="apart">
        <Group noWrap>
          <Checkbox
            checked={isSelected}
            onChange={() => onToggleSelect(user.id)}
            aria-label={`Select user ${user.username}`}
            size="md"
          />
          <Avatar color="blue" radius="xl" src={user.avatar_url || null}>{initials}</Avatar>
          <div>
            <Text weight={500} size="sm" lineClamp={1}>{user.username}</Text>
            <Text color="dimmed" size="xs" lineClamp={1}>{user.email}</Text>
          </div>
        </Group>

        <Menu withinPortal position="bottom-end" shadow="sm">
          <Menu.Target>
            <ActionIcon variant="subtle">
              <IconDotsVertical size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item icon={<IconEye size={14} />} onClick={() => onViewProfile(user.id)}>View Performance</Menu.Item>
            <Menu.Item icon={<IconTrash size={14} />} color="red" onClick={() => onDelete([user.id])}>Delete User</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      <Select
        mt="sm"
        label="Role"
        data={['Manager', 'Salesperson']} // Simplified data for the dropdown
        value={user.role}
        onChange={(newRole) => onRoleChange(user.id, newRole)}
        size="xs"
      />
    </Paper>
  );
};


export default function UserListPro() {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filterRole, setFilterRole] = useState('All Roles');
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filterModalOpened, { open: openFilterModal, close: closeFilterModal }] = useDisclosure(false);
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const PAGE_SIZE = 10;

  // --- (All data fetching and handling logic remains the same) ---

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

  const handleViewProfile = (id) => router.push(`/user-performance/${id}`);

  return (
    <Container fluid px="xl" pt="md">
      <Group align="center" position="apart" mb="md">
        <Group>
          <IconUsers size={28} />
          <Text size="xl" weight={700}>Team Members</Text>
        </Group>
        <Text color="dimmed" size="sm">You have {filtered.length} users.</Text>
      </Group>

      {/* --- Desktop Filters --- */}
      <Group spacing="md" mb="md" align="flex-end" className="hidden md:flex">
        <TextInput
          icon={<IconSearch size={16} />}
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ flex: 1 }}
        />
        <Select
          data={['All Roles', 'Manager', 'Salesperson']}
          value={filterRole}
          onChange={setFilterRole}
          icon={<IconFilter size={16} />}
        />
      </Group>
      
      {/* --- Mobile Filters --- */}
      <Group mb="md" className="md:hidden">
        <Button
            leftIcon={<IconFilter size={16} />}
            variant="default"
            onClick={openFilterModal}
            fullWidth
        >
            Filters & Search
        </Button>
      </Group>

      <Modal opened={filterModalOpened} onClose={closeFilterModal} title="Filters & Search">
        <TextInput
          label="Search by name or email"
          icon={<IconSearch size={16} />}
          placeholder="..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          mb="md"
        />
        <Select
          label="Filter by Role"
          data={['All Roles', 'Manager', 'Salesperson']}
          value={filterRole}
          onChange={setFilterRole}
          icon={<IconFilter size={16} />}
        />
        <Button fullWidth onClick={closeFilterModal} mt="lg">
            Apply Filters
        </Button>
      </Modal>

      <div style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />

        {/* --- Desktop View: Table --- */}
        <Card withBorder radius="md" p={0} className="hidden md:block">
          <ScrollArea>
            <Table miw={800} verticalSpacing="sm" highlightOnHover>
              <thead>
                <tr>
                  <th style={{ width: 60 }}>
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
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(user => (
                  <tr key={user.id}>
                    <td><Checkbox checked={selected.includes(user.id)} onChange={() => toggleSelect(user.id)} /></td>
                    <td>
                      <Group spacing="sm">
                        <Avatar color="blue" radius="xl" src={user.avatar_url || null}>{user.username.split(' ').map(n=>n[0]).join('')}</Avatar>
                        <Text weight={500}>{user.username}</Text>
                      </Group>
                    </td>
                    <td><Text color="dimmed">{user.email}</Text></td>
                    <td>
                      <Select
                        data={['Manager', 'Salesperson']}
                        value={user.role}
                        onChange={v => handleRoleChange(user.id, v)}
                        size="xs" sx={{ width: 140 }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
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
        <div className="md:hidden space-y-3">
          {paged.length > 0 ? (
            paged.map(user => (
              <UserCard
                key={user.id}
                user={user}
                selected={selected}
                onToggleSelect={toggleSelect}
                onRoleChange={handleRoleChange}
                onDelete={handleDelete}
                onViewProfile={handleViewProfile}
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
            style={{ ...styles, position: 'fixed', bottom: 20, left: 20, right: 20, zIndex: 10 }}
            p="sm"
            shadow="md"
            radius="md"
            className="md:hidden"
          >
            <Group position="apart">
              <Text weight={500}>{selected.length} selected</Text>
              <Button color="red" size="xs" onClick={() => handleDelete(selected)}>
                <IconTrash size={16} style={{ marginRight: '8px' }} />
                Delete
              </Button>
            </Group>
          </Paper>
        )}
      </Transition>
    </Container>
  );
}