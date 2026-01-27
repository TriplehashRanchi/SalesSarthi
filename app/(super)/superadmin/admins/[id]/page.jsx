'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import superAdminAxios from '@/utils/superAdminAxios';
import {
  Title, Text, Badge, Card, Grid, Loader, Switch, Group, Table, Button, Stack
} from '@mantine/core';
import { IconLockOpen, IconLock } from '@tabler/icons-react';


const ADD_ONS = [
  { code: 'BUSINESS_KUNDLI', label: 'Business Kundli', description: 'Playbook, repair plan, and PDF reports.' },
  { code: 'FINANCIAL_KUNDLI', label: 'Financial Kundli', description: 'Financial diagnostic engine and exports.' },
  { code: 'RAG_DASHBOARD', label: 'RAG Agent Dashboard', description: 'Agent health tracking and risk insights.' },
];

const AdminDetailsPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [addOns, setAddOns] = useState({});
  const [addOnsLoading, setAddOnsLoading] = useState(true);
  const [addOnUpdating, setAddOnUpdating] = useState({});


  const fetchAddOns = async () => {
    try {
      setAddOnsLoading(true);
      const res = await superAdminAxios.get(`/api/superadmin/admins/${id}/add-ons`);
      const active = res.data?.add_ons || [];
      const nextState = {};
      ADD_ONS.forEach((addon) => {
        nextState[addon.code] = active.includes(addon.code);
      });
      setAddOns(nextState);
    } catch (err) {
      console.error('Failed to fetch add-ons:', err.message);
    } finally {
      setAddOnsLoading(false);
    }
  };

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
    if (id) {
      fetchAdmin();
      fetchAddOns();
    }
  }, [id]);

  const toggleAddOnAccess = async (code) => {
    if (!admin) return;
    try {
      setAddOnUpdating((prev) => ({ ...prev, [code]: true }));
      const current = !!addOns[code];
      const status = current ? 'Inactive' : 'Active';
      await superAdminAxios.patch(`/api/superadmin/admins/${admin.admin_id}/add-ons/${code}`, { status });
      setAddOns((prev) => ({ ...prev, [code]: !current }));
    } catch (err) {
      console.error('Add-on update failed:', err.message);
    } finally {
      setAddOnUpdating((prev) => ({ ...prev, [code]: false }));
    }
  };

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


      <Card withBorder shadow="sm" padding="lg">
        <Group justify="space-between" align="center" mb="sm">
          <div>
            <Title order={5}>Premium Access Controls</Title>
            <Text size="sm" color="dimmed">Enable or disable add-on modules for this admin.</Text>
          </div>
          <Badge color="yellow" variant="light">Add-on Access</Badge>
        </Group>
        {addOnsLoading ? (
          <Loader size="sm" />
        ) : (
          <Stack gap="sm">
            {ADD_ONS.map((addon) => (
              <Card key={addon.code} withBorder radius="md" padding="md" className="bg-gray-50">
                <Group justify="space-between" align="center">
                  <div>
                    <Text fw={600}>{addon.label}</Text>
                    <Text size="xs" color="dimmed">{addon.description}</Text>
                  </div>
                  <Switch
                    checked={!!addOns[addon.code]}
                    onChange={() => toggleAddOnAccess(addon.code)}
                    disabled={addOnUpdating[addon.code]}
                    onLabel={<IconLockOpen size={16} />}
                    offLabel={<IconLock size={16} />}
                  />
                </Group>
              </Card>
            ))}
          </Stack>
        )}
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
