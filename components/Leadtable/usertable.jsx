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
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconTrash, IconEye, IconUsers, IconSearch, IconFilter } from '@tabler/icons-react';

export default function UserListPro() {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filterRole, setFilterRole] = useState('All Roles');
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
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
        const res = await fetch(`${API_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setUsers(data);
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
  }, [users, filterRole, searchTerm]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // bulk delete
  const toggleSelect = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleDelete = async (ids) => {
    if (!window.confirm(`Delete ${ids.length} user(s)?`)) return;
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
      setSelected([]);
      // refetch users
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  const handleRoleChange = async (id, newRole) => {
    try {
      const auth = getAuth();
      const token = await auth.currentUser.getIdToken();
      await fetch(`${API_URL}/api/admin/users/${id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      showNotification({ title: 'Updated', message: 'Role changed', color: 'green' });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
    } catch (err) {
      showNotification({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  return (
    <Container fluid px="xl" pt="md">
      <Group align="center" position="apart" mb="md">
        <Group>
          <IconUsers size={28} />
          <Text size="xl" weight={700}>Team Members</Text>
        </Group>
        <Text color="dimmed">Hello, Admin! You have {filtered.length} users.</Text>
      </Group>

      <Group spacing="md" mb="md" align="flex-end">
        <input
          icon={<IconSearch size={16} />}
          placeholder="Search name or email..."
          value={searchTerm}
          className='form-input w-2/3'
          onChange={e => setSearchTerm(e.target.value)}
        />
        <Select
          placeholder="Filter by Role"
          data={['All Roles', 'Manager', 'Salesperson']}
          value={filterRole}
          onChange={setFilterRole}
          icon={<IconFilter size={16} />}
          sx={{ width: 180 }}
        />
        {selected.length > 0 && (
          <Button color="red" onClick={() => handleDelete(selected)}>
            Delete ({selected.length})
          </Button>
        )}
      </Group>

      <Card withBorder radius="md" p={0} style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />
        <ScrollArea>
          <Table miw={800} verticalSpacing="sm" className='dark:text-white dark:bg-gray-800'>
            <thead>
              <tr>
                <th><Checkbox
                  checked={selected.length === paged.length && paged.length > 0}
                  indeterminate={selected.length > 0 && selected.length < paged.length}
                  onChange={() => paged.forEach(u => toggleSelect(u.id))}
                /></th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(user => (
                <tr key={user.id}>
                  <td><Checkbox
                    checked={selected.includes(user.id)}
                    onChange={() => toggleSelect(user.id)}
                  /></td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>
                    <Select
                      data={[user.role, 'Manager', 'Salesperson'].filter((v, i, a) => a.indexOf(v) === i)}
                      value={user.role}
                      onChange={v => handleRoleChange(user.id, v)}
                      size="xs"
                      sx={{ width: 140 }}
                    />
                  </td>
                  <td className="text-center">
                    <Group spacing="xs" position="center">
                      <ActionIcon color="blue" onClick={() => router.push(`/user-performance/${user.id}`)}>
                        <IconEye size={18} />
                      </ActionIcon>
                      <ActionIcon color="red" onClick={() => handleDelete([user.id])}>
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Group>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </ScrollArea>
        {totalPages > 1 && (
          <Group position="center" py="sm">
            <Pagination page={page} onChange={setPage} total={totalPages} />
          </Group>
        )}
      </Card>
    </Container>
  );
}
