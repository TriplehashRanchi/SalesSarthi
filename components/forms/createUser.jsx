'use client';
import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Description } from '@headlessui/react';
import Swal from 'sweetalert2';
import axios from 'axios';

const CreateUserModal = ({ isOpen, closeModal }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        date: '',  // Subscription Date
        role: '',
        password: '',
        confirmPassword: '',
    });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.firstName || !formData.lastName || !formData.email || !formData.role || !formData.password) {
            Swal.fire('Error', 'Please fill all required fields!', 'error');
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            Swal.fire('Error', 'Passwords do not match!', 'error');
            return;
        }

        try {
            const response = await axios.post(`${API_URL}/api/superadmin/create-user`, formData);

            if (response.data.success) {
                Swal.fire('Success', 'User created successfully!', 'success');
                closeModal();
            }
        } catch (error) {
            console.error('Error creating user:', error);
            Swal.fire('Error', 'Failed to create user', 'error');
        }
    };

    return (
        <Dialog open={isOpen} onClose={closeModal} className="fixed inset-0 flex items-center justify-center z-50 bg-black/60">
            <DialogPanel className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6">
                <DialogTitle className="text-lg font-semibold dark:text-white">Create User</DialogTitle>
                <Description className="text-sm text-gray-500 dark:text-gray-400">
                    Fill in the details to add a new user.
                </Description>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    {/* First Name */}
                    <div>
                        <input
                            type="text"
                            name="firstName"
                            placeholder="First Name *"
                            value={formData.firstName}
                            onChange={handleChange}
                            className="form-input w-full p-2 rounded border"
                            required
                        />
                    </div>

                    {/* Last Name */}
                    <div>
                        <input
                            type="text"
                            name="lastName"
                            placeholder="Last Name *"
                            value={formData.lastName}
                            onChange={handleChange}
                            className="form-input w-full p-2 rounded border"
                            required
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <input
                            type="email"
                            name="email"
                            placeholder="Email *"
                            value={formData.email}
                            onChange={handleChange}
                            className="form-input w-full p-2 rounded border"
                            required
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <input
                            type="text"
                            name="phone"
                            placeholder="Phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="form-input w-full p-2 rounded border"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <input
                            type="password"
                            name="password"
                            placeholder="Password *"
                            value={formData.password}
                            onChange={handleChange}
                            className="form-input w-full p-2 rounded border"
                            required
                        />
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <input
                            type="password"
                            name="confirmPassword"
                            placeholder="Confirm Password *"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="form-input w-full p-2 rounded border"
                            required
                        />
                    </div>

                    {/* Subscription Date (Fixed) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-white">Subscription Ends On *</label>
                        <input
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            className="form-input w-full p-2 rounded border"
                            required
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-4 justify-end mt-4">
                        <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
                            Cancel
                        </button>
                        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                            Create User
                        </button>
                    </div>
                </form>
            </DialogPanel>
        </Dialog>
    );
};

export default CreateUserModal;
