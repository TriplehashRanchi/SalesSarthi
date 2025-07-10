'use client';

import { useEffect, useState } from 'react';
import {
  Modal,
  TextInput,
  PasswordInput,
  Button,
  Group,
  Select,
  Grid,
  Text,
  Notification,
} from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { IconUsersPlus, IconCheck, IconX } from '@tabler/icons-react';
import superAdminAxios from '@/utils/superAdminAxios';

const CreateAdminModal = ({ isOpen, closeModal, onSuccess }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    subscription_plan: '',
    expires_at: null,
  });

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // 🔹 Fetch Plans from DB
  const fetchPlans = async () => {
    try {
      const res = await superAdminAxios.get('/api/plans/superadmin');
      setPlans(res.data);
    } catch (err) {
      console.error('Failed to fetch plans:', err.message);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await superAdminAxios.post('/api/superadmin/admins', form);
      setSuccessMsg('✅ Admin created successfully');
      if (onSuccess) onSuccess();

      setTimeout(() => {
        setSuccessMsg(null);
        closeModal();
        setForm({
          name: '',
          email: '',
          phone: '',
          password: '',
          subscription_plan: '',
          expires_at: null,
        });
      }, 1000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to create admin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchPlans();
  }, [isOpen]);

  return (
    <Modal
      opened={isOpen}
      onClose={closeModal}
      title={
        <Group>
          <IconUsersPlus size={22} />
          <Text weight={600}>Create New Customer</Text>
        </Group>
      }
      size="lg"
      radius="md"
      padding="lg"
    >
      <Grid gutter="md">
        <Grid.Col span={6}>
          <TextInput
            label="Full Name"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
          />
        </Grid.Col>

        <Grid.Col span={6}>
          <TextInput
            label="Email Address"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            required
          />
        </Grid.Col>

        <Grid.Col span={6}>
          <TextInput
            label="Phone Number"
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            required
          />
        </Grid.Col>

        <Grid.Col span={6}>
          <PasswordInput
            label="Password"
            value={form.password}
            onChange={(e) => handleChange('password', e.target.value)}
            required
          />
        </Grid.Col>

        <Grid.Col span={6}>
          <Select
            label="Subscription Plan"
            placeholder="Select a plan"
            data={plans.map((p) => ({
              label: `${p.name} - ₹${p.price_paise / 100}`,
              value: p.name,
            }))}
            value={form.subscription_plan}
            onChange={(val) => handleChange('subscription_plan', val)}
            required
          />
        </Grid.Col>

        <Grid.Col span={6}>
          <DatePicker
            label="Custom Expiry (Optional)"
            placeholder="Choose expiry"
            value={form.expires_at}
            onChange={(val) => handleChange('expires_at', val)}
          />
        </Grid.Col>
      </Grid>

      {/* Feedback */}
      {errorMsg && (
        <Notification mt="md" color="red" icon={<IconX size={18} />}>
          {errorMsg}
        </Notification>
      )}
      {successMsg && (
        <Notification mt="md" color="green" icon={<IconCheck size={18} />}>
          {successMsg}
        </Notification>
      )}

      <Group position="right" mt="xl">
        <Button variant="default" onClick={closeModal} disabled={loading}>
          Cancel
        </Button>
        <Button
          loading={loading}
          onClick={handleSubmit}
          className="bg-cyan-600 hover:bg-cyan-700"
        >
          Create Admin
        </Button>
      </Group>
    </Modal>
  );
};

export default CreateAdminModal;
