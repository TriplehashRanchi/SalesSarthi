'use client';

import { useState } from 'react';
import {
  TextInput,
  PasswordInput,
  Select,
  Button,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { getAuth } from 'firebase/auth';
import axios from 'axios';

export default function AddUser() {
  const [userData, setUserData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: '',
    password: '',
    confirm_password: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData((p) => ({ ...p, [name]: value }));
  };

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const handleSubmit = async () => {
    const {
      first_name,
      last_name,
      email,
      phone,
      role,
      password,
      confirm_password,
    } = userData;

    // Front‑end validation
    if (
      !first_name ||
      !last_name ||
      !email ||
      !phone ||
      !role ||
      !password ||
      !confirm_password
    ) {
      return showNotification({
        title: 'Validation error',
        message: 'All fields are required.',
        color: 'red',
      });
    }
    if (password !== confirm_password) {
      return showNotification({
        title: 'Validation error',
        message: 'Passwords do not match.',
        color: 'red',
      });
    }

    // Get admin’s Firebase auth token
    const auth = getAuth();
    const adminUser = auth.currentUser;
    if (!adminUser) {
      return showNotification({
        title: 'Not authenticated',
        message: 'You must be logged in to add users.',
        color: 'red',
      });
    }
    const token = await adminUser.getIdToken();

    try {
      await axios.post(
        `${API_URL}/api/users`,
        { first_name, last_name, email, phone, role, password },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showNotification({
        title: 'Success',
        message: 'User added successfully!',
        color: 'green',
      });

      // reset form
      setUserData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: '',
        password: '',
        confirm_password: '',
      });
    } catch (err) {
      console.error(err);
      showNotification({
        title: 'Error',
        message:
          err.response?.data?.message ||
          'An error occurred while adding user.',
        color: 'red',
      });
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Add New User</h2>

      <div className="grid grid-cols-2 gap-4">
        <TextInput
          label="First Name"
          name="first_name"
          value={userData.first_name}
          onChange={handleChange}
          required
        />
        <TextInput
          label="Last Name"
          name="last_name"
          value={userData.last_name}
          onChange={handleChange}
          required
        />
        <TextInput
          label="Email"
          name="email"
          type="email"
          value={userData.email}
          onChange={handleChange}
          required
        />
        <TextInput
          label="Phone Number"
          name="phone"
          value={userData.phone}
          onChange={handleChange}
          required
        />
        <Select
          label="Role"
          name="role"
          data={['Admin', 'Manager', 'Salesperson']}
          value={userData.role}
          onChange={(v) => setUserData((p) => ({ ...p, role: v }))}
          required
        />
        <PasswordInput
          label="Password"
          name="password"
          value={userData.password}
          onChange={handleChange}
          required
        />
        <PasswordInput
          label="Confirm Password"
          name="confirm_password"
          value={userData.confirm_password}
          onChange={handleChange}
          required
        />
      </div>

      <Button fullWidth className="mt-4" onClick={handleSubmit}>
        Add User
      </Button>
    </div>
  );
}



//  {
//     "message": "User added successfully!",
//     "credentials": {
//         "email": "harry@potter.com",
//         "password": "ui7c5uy9"
//     }
// }