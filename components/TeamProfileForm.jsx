'use client';
import React, { useState, useEffect } from 'react';
import IconHome from '@/components/icon/icon-home';
import { IconBuilding } from '@tabler/icons-react';
import IconDollarSignCircle from '@/components/icon/icon-dollar-sign-circle';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { useCloudinaryUpload } from '@/utils/useCloudinaryUpload';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const UserAccountSettingsTabs = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [isLoading, setIsLoading] = useState(true);
  const { upload: cloudUpload, uploading: cloudUploading } = useCloudinaryUpload();

  const [profile, setProfile] = useState({
    username: '',
    phone: '',
    email: '',
    country: '',
    address: '',
    avatar: null,
  });
  const [avatarPreview, setAvatarPreview] = useState(null);

  const [company, setCompany] = useState({
    companyName: '',
    gst: '',
    regAddress: '',
    contactEmail: '',
    phone1: '',
    phone2: '',
    logo_url: '',
  });
  const [logoPreview, setLogoPreview] = useState(null);

  const [subscription, setSubscription] = useState({
    plan: '',
    status: '',
    expires_at: '',
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();

        const { data: userData } = await axios.get(`${API_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile({
          username: userData.username || '',
          phone: userData.phone || '',
          email: userData.email || '',
          country: userData.country || '',
          address: userData.address || '',
          avatar: userData.avatar_url || null,
        });
        if (userData.avatar_url) setAvatarPreview(userData.avatar_url);

        setSubscription({
          plan: userData?.admin?.subscription_plan || '',
          status: userData?.admin?.subscription_status || '',
          expires_at: userData?.admin?.expires_at || '',
        });

        const { data: comp } = await axios.get(`${API_URL}/api/companies/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCompany({
          companyName: comp.name || '',
          gst: comp.gst_number || '',
          regAddress: comp.address || '',
          contactEmail: comp.billing_email || '',
          phone1: comp.phone_1 || '',
          phone2: comp.phone_2 || '',
          logo_url: comp.logo_url || '',
        });
        if (comp.logo_url) setLogoPreview(comp.logo_url);
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || cloudUploading) return;
    try {
      const url = await cloudUpload(file);
      setProfile((p) => ({ ...p, avatar: url }));
      setAvatarPreview(url);
      await saveProfileInfo(url);
    } catch (err) {
      console.error('Avatar upload failed:', err);
    }
  };

  const handleProfileChange = (id, val) => {
    setProfile((p) => ({ ...p, [id]: val }));
  };

  const saveProfileInfo = async (newAvatarUrl) => {
    try {
      const token = await getAuth().currentUser.getIdToken();
      const payload = {
        username: profile.username,
        phone: profile.phone,
        country: profile.country,
        address: profile.address,
        avatar_url: newAvatarUrl ?? profile.avatar,
      };
      await axios.put(`${API_URL}/api/users/me`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Profile saved successfully!');
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Error saving profile.');
    }
  };

  const tabs = [
    { id: 'home', label: 'Personal Info', icon: <IconHome /> },
    { id: 'company', label: 'Company Details', icon: <IconBuilding /> },
    { id: 'subscription', label: 'Subscription', icon: <IconDollarSignCircle /> },
  ];

  if (isLoading) {
    return <div className="p-5">Loading settings...</div>;
  }

  return (
    <div className="pt-5">
      <div className="mb-5 flex items-center justify-between">
        <h5 className="text-lg font-semibold">My Settings</h5>
      </div>
      <ul className="mb-5 flex border-b">
        {tabs.map((t) => (
          <li key={t.id} className="inline-block">
            <button
              onClick={() => setActiveTab(t.id)}
              className={`flex gap-2 border-b-2 p-4 ${
                activeTab === t.id ? 'border-primary text-primary' : 'border-transparent'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      {activeTab === 'home' && (
        <div className="mb-5 bg-white p-4 rounded border">
          <h6 className="mb-4 font-bold">General Information</h6>
          <div className="flex flex-col sm:flex-row">
            <div className="mb-4 sm:mr-4">
              <label htmlFor="avatarInput">
                <img
                  src={avatarPreview || '/assets/images/profile-34.jpeg'}
                  alt="avatar"
                  className="h-20 w-20 rounded-full object-cover cursor-pointer"
                />
              </label>
              <input
                id="avatarInput"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
              {[
                { id: 'username', label: 'Full Name', placeholder: 'Your Name' },
                { id: 'phone', label: 'Phone', placeholder: '+91 ...' },
                { id: 'email', label: 'Email', placeholder: 'you@example.com', type: 'email' },
              ].map((f) => (
                <div key={f.id}>
                  <label htmlFor={f.id}>{f.label}</label>
                  {f.id === 'phone' ? (
                    <PhoneInput
                      country="in"
                      value={profile.phone}
                      onChange={(value) => handleProfileChange('phone', `+${value}`)}
                      enableSearch
                      countryCodeEditable={false}
                      inputProps={{ id: f.id, placeholder: f.placeholder }}
                    />
                  ) : (
                    <input
                      id={f.id}
                      type={f.type || 'text'}
                      placeholder={f.placeholder}
                      className="form-input"
                      value={profile[f.id]}
                      onChange={(e) => handleProfileChange(f.id, e.target.value)}
                    />
                  )}
                </div>
              ))}

              <div>
                <label htmlFor="country">Country</label>
                <select
                  id="country"
                  className="form-select"
                  value={profile.country}
                  onChange={(e) => handleProfileChange('country', e.target.value)}
                >
                  {['All Countries', 'India', 'United States', 'Canada'].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="address">Address</label>
                <input
                  id="address"
                  className="form-input"
                  placeholder="Address"
                  value={profile.address}
                  onChange={(e) => handleProfileChange('address', e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  className="btn btn-primary mt-2"
                  onClick={() => saveProfileInfo()}
                >
                  Save Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'company' && (
        <div className="bg-white p-6 rounded border">
          <h6 className="mb-4 font-bold">Company Details</h6>
          <div className="mb-4">
            <label className="block mb-2">Logo</label>
            <div className="h-24 w-24 border flex items-center justify-center">
              {logoPreview ? (
                <img src={logoPreview} alt="logo" className="h-full object-contain" />
              ) : (
                <span>No logo</span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { id: 'companyName', label: 'Company Name' },
              { id: 'gst', label: 'GST / VAT No.' },
              { id: 'regAddress', label: 'Registered Address' },
              { id: 'contactEmail', label: 'Billing Email' },
              { id: 'phone1', label: 'Primary Phone' },
              { id: 'phone2', label: 'Secondary Phone' },
            ].map((f) => (
              <div key={f.id}>
                <label htmlFor={f.id}>{f.label}</label>
                <input
                  id={f.id}
                  className="form-input bg-gray-100 cursor-not-allowed"
                  value={company[f.id] || 'N/A'}
                  disabled
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'subscription' && (
        <div className="bg-white p-6 rounded border max-w-md">
          <h6 className="mb-4 font-bold">Subscription</h6>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">
                {subscription.plan || 'Free'} Plan <span className="text-sm">({subscription.status || 'N/A'})</span>
              </p>
              {subscription.expires_at && (
                <p className="text-sm">Expires on {new Date(subscription.expires_at).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAccountSettingsTabs;
