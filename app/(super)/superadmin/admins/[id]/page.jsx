'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import superAdminAxios from '@/utils/superAdminAxios';
import {
  Title, Text, Badge, Card, Grid, Loader, Switch, Group, Table, Button
} from '@mantine/core';
import { IconLockOpen, IconLock } from '@tabler/icons-react';

const AdminDetailsPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchAdmin = async () => {
    try {
      const res = await superAdminAxios.get(`/api/superadmin/admins/${id}`);
      setAdmin(res.data);
    } catch (err) {
      console.error('Admin not found or failed to fetch:', err.message);
      // router.push('/superadmin/admins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchAdmin();
  }, [id]);

  const formatDate = (d) =>
    new Date(d).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

const toggleAccess = async () => {
  if (!admin) return;
  try {
    setUpdating(true);

    let newStatus;
    if (admin.subscription_status === 'Active') {
      newStatus = 'Cancelled';
    } else if (admin.subscription_status === 'Cancelled') {
      newStatus = 'Active';
    } else {
      // Do nothing for 'Expired'
      return;
    }

    await superAdminAxios.put(`/api/superadmin/access/${admin.admin_id}`, { status: newStatus });
    setAdmin({ ...admin, subscription_status: newStatus });
  } catch (err) {
    console.error('Access toggle failed:', err.message);
  } finally {
    setUpdating(false);
  }
};


  if (loading) return <Loader className="mt-10" />;
  if (!admin) return <Text color="red">Admin not found.</Text>;

  const { metrics, transactions } = admin;

  return (
    <div className="space-y-6 mt-6">
      <div>
        <Title order={3}>Admin Details</Title>
        <Text size="sm" color="dimmed">Full profile for admin ID: <strong>{id}</strong></Text>
      </div>

      {/* 🧍 Profile Info */}
      <Card withBorder shadow="sm" padding="lg">
        <Grid gutter="lg">
          <Grid.Col span={6}>
            <Text><strong>Name:</strong> {admin.name}</Text>
            <Text><strong>Email:</strong> {admin.email}</Text>
            <Text><strong>Phone:</strong> {admin.phone}</Text>
            <Text><strong>Created At:</strong> {formatDate(admin.created_at)}</Text>
          </Grid.Col>
          <Grid.Col span={6}>
            <Text><strong>Plan:</strong> {admin.subscription_plan || 'Basic'}</Text>
            <Text><strong>Status:</strong>{' '}
              <Badge color={admin.subscription_status === 'Active' ? 'green' : 'red'}>
                {admin.subscription_status}
              </Badge>
            </Text>
            <Text><strong>Expires At:</strong> {formatDate(admin.expires_at)}</Text>
           <Group mt="md">
  <Switch
    checked={admin.subscription_status === 'Active'}
    onChange={toggleAccess}
    disabled={admin.subscription_status === 'Expired' || updating}
    label={
      admin.subscription_status === 'Expired'
        ? 'Expired - Cannot Modify'
        : admin.subscription_status === 'Active'
        ? 'Access Enabled'
        : 'Access Cancelled'
    }
    onLabel={<IconLockOpen size={16} />}
    offLabel={<IconLock size={16} />}
  />
</Group>
          </Grid.Col>
        </Grid>
      </Card>

      {/* 📊 Metrics */}
      <Grid>
        <Grid.Col span={3}>
          <Card withBorder shadow="sm" className="text-center">
            <Text size="xl" weight={600}>{admin.user_count}</Text>
            <Text size="sm" color="dimmed">Total Users</Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder shadow="sm" className="text-center">
            <Text size="xl" weight={600}>{admin.lead_count}</Text>
            <Text size="sm" color="dimmed">Total Leads</Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder shadow="sm" className="text-center">
            <Text size="xl" weight={600}>₹{metrics?.totalRevenue || 0}</Text>
            <Text size="sm" color="dimmed">Total Revenue</Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder shadow="sm" className="text-center">
            <Text size="xl" weight={600}>{metrics?.transactionCount || 0}</Text>
            <Text size="sm" color="dimmed">Transactions</Text>
          </Card>
        </Grid.Col>
      </Grid>

      {/* 💳 Transactions */}
      {transactions?.length > 0 && (
  <div className="mt-6">
    <Title order={5}>Recent Transactions</Title>
    <Card withBorder shadow="sm" mt="md" p="md">
      <Table striped withBorder highlightOnHover>
        <thead>
          <tr>
            <th>Txn ID</th>
            <th>Gateway Txn ID</th>
            <th>Amount (₹)</th>
            <th>Status</th>
            <th>Description</th>
            <th>Paid On</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn) => (
            <tr key={txn.txn_id}>
              <td>{txn.txn_id}</td>
              <td className="text-xs text-blue-700 break-all">{txn.gateway_txn_id || '—'}</td>
              <td>₹{txn.amount}</td>
              <td>
                <Badge color={txn.status === 'Success' ? 'green' : 'red'}>
                  {txn.status}
                </Badge>
              </td>
              <td>{txn.description || '—'}</td>
              <td>{new Date(txn.txn_date).toLocaleString('en-IN')}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  </div>
)}

    </div>
  );
};

export default AdminDetailsPage;
