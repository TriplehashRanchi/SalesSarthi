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
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
 // Tailwind classes for Mantine input parts (if overriding Mantine's dark theme)
 const mantineInputDarkStyles = {
  // Using Mantine's classNames prop to target internal elements
  // These are examples, actual class names might vary slightly per Mantine version or component
  input: 'dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:placeholder-gray-400 focus:dark:border-blue-500 focus:dark:ring-blue-500',
  label: 'dark:text-gray-300', // For the Mantine-generated label
  // For Select dropdown
  dropdown: 'dark:bg-gray-700 dark:border-gray-600',
  item: 'dark:text-gray-200 hover:dark:bg-gray-600',
  selected: 'dark:bg-blue-600 dark:text-white', // For selected item in Select
};


return (
  <Container size="lg " py="xl">
    <Group spacing="xs" mb="md">
      <IconUserPlus size={28} className="text-blue-600 dark:text-blue-400" />
      <Title order={2} className="text-gray-800 dark:text-white">Add New Team Member</Title>
    </Group>
    <Divider mb="lg" className="border-gray-300 dark:border-gray-700" />
    <Card
      withBorder
      shadow="sm"
      radius="md"
      p="sm"
      className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
 
        <SimpleGrid cols={2} spacing="lg" breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
          <TextInput
            label="First Name"
            name="first_name"
            placeholder='Enter First Name'
            icon={<IconUserPlus size={16} />}
            value={userData.first_name}
            onChange={handleChange}
            required
            // Apply Tailwind dark mode styles to Mantine input parts
            // Option 1: Using classNames prop (more direct for Tailwind)
            classNames={{
              input: mantineInputDarkStyles.input,
              label: mantineInputDarkStyles.label,
            }}
            // Option 2: Using styles prop (more for CSS-in-JS, but can work)
            // styles={(currentTheme) => ({
            //   input: currentTheme.colorScheme === 'dark' ? { backgroundColor: currentTheme.colors.dark[6], color: currentTheme.white, borderColor: currentTheme.colors.dark[4] } : {},
            //   label: currentTheme.colorScheme === 'dark' ? { color: currentTheme.colors.dark[1] } : {},
            // })}
          />
          <TextInput
            label="Last Name"
            name="last_name"
            placeholder='Enter Last Name'
            icon={<IconUserPlus size={16} />}
            value={userData.last_name}
            onChange={handleChange}
            required
            classNames={{
              input: mantineInputDarkStyles.input,
              label: mantineInputDarkStyles.label,
            }}
          />
          <TextInput
            label="Email Address"
            name="email"
            type="email"
            placeholder='email@example.com'
            icon={<IconMail size={16} />}
            value={userData.email}
            onChange={handleChange}
            required
            classNames={{
              input: mantineInputDarkStyles.input,
              label: mantineInputDarkStyles.label,
            }}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Phone Number
            </label>
            {/* PhoneInput still requires special handling, see notes below */}
            <PhoneInput
              country="in"
              onlyCountries={['us', 'gb', 'in', 'ca', 'au', 'de', 'fr', 'es', 'it', 'br']}
              value={userData.phone}
              onChange={handlePhoneChange}
              enableSearch
              className="react-international-phone-input dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:placeholder-gray-400 focus:dark:border-blue-500 focus:dark:ring-blue-500"
              inputClass='form-input'
              // Attempt to style the input it renders via inputProps.className
              // This is highly dependent on react-international-phone's implementation
              // If the above doesn't work, global CSS is the most reliable for PhoneInput:
              // .dark .react-international-phone-input { /* Tailwind equivalent styles */ }
            />
          </div>
          <Select
            label="Role"
            name="role"
            placeholder='Select a role'
            data={['Manager', 'Salesperson']}
            value={userData.role}
            onChange={(v) => setUserData((prev) => ({ ...prev, role: v }))}
            required
            classNames={{
              input: mantineInputDarkStyles.input,
              label: mantineInputDarkStyles.label,
              dropdown: mantineInputDarkStyles.dropdown,
              item: mantineInputDarkStyles.item,
              // selected class might be needed if default selection style isn't good
            }}
          />
          <PasswordInput
            label="Password"
            name="password"
            placeholder='Enter Password'
            icon={<IconShieldLock size={16} />}
            value={userData.password}
            onChange={handleChange}
            required
            classNames={{
              input: mantineInputDarkStyles.input,
              label: mantineInputDarkStyles.label,
              innerInput: mantineInputDarkStyles.input, // PasswordInput has an innerInput
            }}
          />
          <PasswordInput
            label="Confirm Password"
            name="confirm_password"
            placeholder='Confirm Password'
            icon={<IconShieldLock size={16} />}
            value={userData.confirm_password}
            onChange={handleChange}
            required
            classNames={{
              input: mantineInputDarkStyles.input, // This styles the wrapper
              label: mantineInputDarkStyles.label,
              innerInput: mantineInputDarkStyles.input, // This styles the actual password field
            }}
          />
        </SimpleGrid>
        <Group position="right" mt="xl">
          <Button
            size="md"
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white" // Explicit Tailwind for button
          >
            Save
          </Button>
        </Group>
 
    </Card>
  </Container>
);
};


//  {
//     "message": "User added successfully!",
//     "credentials": {
//         "email": "harry@potter.com",
//         "password": "ui7c5uy9"
//     }
// }