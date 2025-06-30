'use client';
import { useState } from 'react';
import { TextInput, Select, Button, PasswordInput } from '@mantine/core';
import axios from 'axios';
import { getAuth } from "firebase/auth"; // 🔹 Firebase Auth

const AddUser = () => {
    const [userData, setUserData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: '',
        password: '',
        confirm_password: ''
    });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const handleChange = (e) => {
        const { name, value } = e.target;
        setUserData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        if (userData.password !== userData.confirm_password) {
            alert('Passwords do not match!');
            return;
        }

        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) {
                alert("You must be logged in!");
                return;
            }

            const token = await user.getIdToken(); // ✅ Get Firebase token

            const formData = {
                first_name: userData.first_name,
                last_name: userData.last_name,
                email: userData.email,
                phone: userData.phone,
                role: userData.role,
                password: userData.password
            };

            await axios.post(`${API_URL}/api/users`, formData, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            alert('User added successfully!');
            setUserData({
                first_name: '',
                last_name: '',
                email: '',
                phone: '',
                role: '',
                password: '',
                confirm_password: ''
            });
        } catch (error) {
            console.error('Error adding user:', error);
            alert('Failed to add user');
        }
    };

    return (
        <div className="p-4 max-w-lg mx-auto bg-white rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Add New User</h2>
            <div className="grid grid-cols-2 gap-4">
                <TextInput label="First Name" name="first_name" required onChange={handleChange} />
                <TextInput label="Last Name" name="last_name" required onChange={handleChange} />
                <TextInput label="Email" name="email" required type="email" onChange={handleChange} />
                <TextInput label="Phone Number" name="phone" required onChange={handleChange} />
                <Select label="Role" name="role" data={['Admin', 'Manager', 'Salesperson']} required onChange={(value) => setUserData((prev) => ({ ...prev, role: value }))} />
                <PasswordInput label="Password" name="password" required onChange={handleChange} />
                <PasswordInput label="Confirm Password" name="confirm_password" required onChange={handleChange} />
            </div>
            <Button className="mt-4 w-full" onClick={handleSubmit}>Add User</Button>
        </div>
    );
};

export default AddUser;


//  {
//     "message": "User added successfully!",
//     "credentials": {
//         "email": "harry@potter.com",
//         "password": "ui7c5uy9"
//     }
// }