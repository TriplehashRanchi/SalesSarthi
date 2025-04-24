'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import axios from 'axios';
import { showNotification } from '@mantine/notifications';
import 'react-phone-input-2/lib/style.css';
import PhoneInput from 'react-phone-input-2';
import {
  Container,
  Card,
  Group,
  Title,
  Divider,
  SimpleGrid,
  TextInput,
  PasswordInput,
  Select,
  Button,
  ScrollArea,
} from '@mantine/core';
import { IconUserPlus, IconMail, IconShieldLock } from '@tabler/icons-react';

export default function AddUserPage() {
  const router = useRouter();
  const [userData, setUserData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: '',
    password: '',
    confirm_password: '',
  });
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData((p) => ({ ...p, [name]: value }));
  };

  const handlePhoneChange = (phone) => {
    setUserData((p) => ({ ...p, phone }));
  };

  const handleSubmit = async () => {
    const { first_name, last_name, email, phone, role, password, confirm_password } = userData;
    if (!first_name || !last_name || !email || !phone || !role || !password || !confirm_password) {
      return showNotification({ title: 'Error', message: 'Please fill all fields.', color: 'red' });
    }
    if (password !== confirm_password) {
      return showNotification({ title: 'Error', message: 'Passwords do not match.', color: 'red' });
    }
     // ensure E.164 format: prefix '+' if not present
     const phoneE164 = phone.startsWith('+') ? phone : `+${phone}`;
    try {
      const auth = getAuth();
      const adminUser = auth.currentUser;
      if (!adminUser) throw new Error('Not authenticated');
      const token = await adminUser.getIdToken();
      await axios.post(
        `${API_URL}/api/users`,
        { first_name, last_name, email, phone: phoneE164, role, password },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showNotification({ title: 'Success', message: 'User added successfully.', color: 'green' });
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      showNotification({ title: 'Error', message: err.response?.data?.message || err.message, color: 'red' });
    }
  };

  return (
    <Container size="md" py="xl">
      <Group spacing="xs" mb="md">
        <IconUserPlus size={28} />
        <Title order={2}>Add New Team Member</Title>
      </Group>
      <Divider mb="lg" />
      <Card withBorder shadow="sm" radius="md" p="lg">
        <ScrollArea>
          <SimpleGrid cols={2} spacing="md" breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>           
            <TextInput
              label="First Name"
              name="first_name"
              icon={<IconUserPlus size={16} />}
              value={userData.first_name}
              onChange={handleChange}
              required
            />
            <TextInput
              label="Last Name"
              name="last_name"
              icon={<IconUserPlus size={16} />}
              value={userData.last_name}
              onChange={handleChange}
              required
            />
            <TextInput
              label="Email Address"
              name="email"
              type="email"
              icon={<IconMail size={16} />}
              value={userData.email}
              onChange={handleChange}
              required
            />
            <div>
              <label className="mb-1 block text-sm font-medium">Phone Number</label>
              <PhoneInput
                country="us"
                onlyCountries={[
                  'us','gb','in','ca','au','de','fr','es','it','br'
                ]}
                value={userData.phone}
                onChange={handlePhoneChange}
                enableSearch
                inputStyle={{ width: '100%' }}
              />
            </div>
            <Select
              label="Role"
              name="role"
              data={['Manager', 'Salesperson']}
              value={userData.role}
              onChange={(v) => setUserData((p) => ({ ...p, role: v }))}
              required
            />
            <PasswordInput
              label="Password"
              name="password"
              icon={<IconShieldLock size={16} />}
              value={userData.password}
              onChange={handleChange}
              required
            />
            <PasswordInput
              label="Confirm Password"
              name="confirm_password"
              icon={<IconShieldLock size={16} />}
              value={userData.confirm_password}
              onChange={handleChange}
              required
            />
          </SimpleGrid>
          <Group position="right" mt="lg">
            <Button size="md" onClick={handleSubmit}>Save</Button>
          </Group>
        </ScrollArea>
      </Card>
    </Container>
  );
}



//  {
//     "message": "User added successfully!",
//     "credentials": {
//         "email": "harry@potter.com",
//         "password": "ui7c5uy9"
//     }
// }