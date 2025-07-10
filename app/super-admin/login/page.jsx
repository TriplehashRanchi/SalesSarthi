'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const SuperAdminLogin = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/superadmin/login`, {
        email,
        password,
      });

      localStorage.setItem('superadmin_token', res.data.token);
      router.push('/superadmin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form onSubmit={handleLogin} className="bg-white rounded-xl p-6 shadow-md max-w-sm w-full">
        <h2 className="text-xl font-bold mb-4 text-center">Super Admin Login</h2>

        {error && <p className="text-red-500 text-sm mb-3 text-center">{error}</p>}

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Email"
          className="form-input w-full mb-4"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Password"
          className="form-input w-full mb-4"
        />

        <button
          type="submit"
          className="btn w-full bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          Login
        </button>
      </form>
    </div>
  );
};

export default SuperAdminLogin;
