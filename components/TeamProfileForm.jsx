'use client';
import React, { useState, useEffect } from 'react';
import IconHome from '@/components/icon/icon-home';
import IconDollarSignCircle from '@/components/icon/icon-dollar-sign-circle';
import { IconBuilding } from '@tabler/icons-react'; // Using Building icon for Company
// Removed unused icons like IconUser, IconPhone, IconLock
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { useCloudinaryUpload } from '@/utils/useCloudinaryUpload'; // Still needed for user avatar

// This component is specifically for standard USERS (Team Members)

const UserAccountSettingsTabs = () => {
    const [activeTab, setActiveTab] = useState('home');
    const [isLoading, setIsLoading] = useState(true);

    // Cloudinary hook for user avatar upload
    const { upload: cloudUpload, uploading: cloudUploading, error: cloudError } = useCloudinaryUpload();

    // ───── personal profile state ─────
    const [profile, setProfile] = useState({
        username: '',
        profession: '',
        location: '',
        phone: '',
        email: '', // Usually non-editable, linked to auth
        country: '',
        address: '',
        avatar: null, // URL string after fetch/upload
    });
    const [avatarPreview, setAvatarPreview] = useState(null); // URL for display

    // ───── company state (read-only) ─────
    const [company, setCompany] = useState({
        companyName: '',
        gst: '',
        regAddress: '',
        contactEmail: '', // Billing email might be sensitive, consider removing if needed
        phone1: '',
        phone2: '',
        logo_url: '',
    });
    const [logoPreview, setLogoPreview] = useState(null); // URL for display

    // ── subscription state (read-only) ──
    const [subscription, setSubscription] = useState({
        plan: '',
        status: '',
        expires_at: '',
    });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    // ───── load existing data for the user ─────
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const auth = getAuth();
                const user = auth.currentUser;
                if (!user) {
                    console.error('User not logged in');
                    setIsLoading(false);
                    return;
                }
                const token = await user.getIdToken();

                // 1. Load personal user data
                // Assuming /api/users/me returns user details + relevant subscription info
                const { data: userData } = await axios.get(`${API_URL}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });

                setProfile({
                    username: userData.username || '',
                    profession: userData.profession || '',
                    location: userData.location || '',
                    phone: userData.phone || '',
                    email: userData.email || '', // Display user's email
                    country: userData.country || '',
                    address: userData.address || '',
                    avatar: userData.avatar_url || null, // Store the URL
                });
                if (userData.avatar_url) setAvatarPreview(userData.avatar_url);

                // Set Subscription details from user data
                 setSubscription({
                    plan: userData.admin.subscription_plan || 'N/A', // Adjust field names if needed
                    status: userData.admin.subscription_status || 'N/A',
                    expires_at: userData.admin.expires_at || null,
                });


                // 2. Load associated Company data (read-only)
                // Assumes user has permission to read their associated company via /api/companies/me
                // Alternatively, company details might be included in the /api/users/me response
                try {
                    const { data: comp } = await axios.get(`${API_URL}/api/companies/user`, { headers: { Authorization: `Bearer ${token}` } });
                    setCompany({
                        companyName: comp.name || '',
                        gst: comp.gst_number || '',
                        regAddress: comp.address || '',
                        contactEmail: comp.billing_email || '', // Display if available
                        phone1: comp.phone_1 || '',
                        phone2: comp.phone_2 || '',
                        logo_url: comp.logo_url || '',
                    });
                     if (comp.logo_url) setLogoPreview(comp.logo_url);
                } catch (companyError) {
                    console.warn('Could not fetch associated company details.', companyError);
                    // Set defaults if company fetch fails or user isn't associated
                    setCompany({ companyName: 'N/A', gst: '', regAddress: '', contactEmail: '', phone1: '', phone2: '', logo_url: '' });
                    setLogoPreview(null);
                }

            } catch (err) {
                console.error('Error fetching user settings data:', err);
                // Display error notification to user
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []); // Run once on mount

    // ───── Handlers for User Profile Editing ───── //
    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file || cloudUploading) return;
        try {
            const url = await cloudUpload(file); // Upload to Cloudinary
            setProfile((p) => ({ ...p, avatar: url })); // Update state with the URL
            setAvatarPreview(url); // Update preview
            // Attempt to save profile immediately after successful upload
            await saveProfileInfo(url);
        } catch (err) {
            console.error('Avatar upload failed', err);
            // Show error notification
        }
    };

    const handleProfileChange = (id, val) => {
        setProfile((p) => ({ ...p, [id]: val }));
    };

    // Saves the user's own profile information
    const saveProfileInfo = async (newAvatarUrl = null) => {
        try {
            const token = await getAuth().currentUser.getIdToken();
            const payload = {
                username: profile.username,
                profession: profile.profession,
                location: profile.location,
                phone: profile.phone,
                country: profile.country,
                address: profile.address,
                 // Use the newly uploaded URL if provided, otherwise use the existing one in state
                avatar_url: newAvatarUrl !== null ? newAvatarUrl : profile.avatar,
            };
            // Use the endpoint for the logged-in user to update their own profile
            await axios.put(`${API_URL}/api/users/me`, payload, { headers: { Authorization: `Bearer ${token}` } });
            alert('Profile saved successfully!'); // User feedback
        } catch (err) {
            console.error('Error saving profile:', err);
            alert('Failed to save profile. Please try again.'); // User feedback
        }
    };

    // Define Tabs available for the User
    const tabs = [
        { id: 'home', label: 'Personal Info', icon: <IconHome /> },
        { id: 'company', label: 'Company Details', icon: <IconBuilding /> },
        { id: 'subscription', label: 'Subscription', icon: <IconDollarSignCircle /> },
        // Removed 'Danger Zone'
    ];

    if (isLoading) {
        return <div className="p-5">Loading your settings...</div>; // Simple loading state
    }

    return (
        <div className="pt-5">
            {/* header */}
            <div className="mb-5 flex items-center justify-between">
                <h5 className="text-lg font-semibold dark:text-white-light">My Settings</h5>
            </div>

            {/* tab nav */}
            <ul className="mb-5 overflow-y-auto whitespace-nowrap border-b border-[#ebedf2] font-semibold dark:border-[#191e3a] sm:flex">
                {tabs.map((t) => (
                    <li key={t.id} className="inline-block">
                        <button
                            onClick={() => setActiveTab(t.id)}
                            className={`flex gap-2 border-b border-transparent p-4 hover:border-primary hover:text-primary ${activeTab === t.id ? '!border-primary text-primary' : ''}`}
                        >
                            {t.icon}
                            {t.label}
                        </button>
                    </li>
                ))}
            </ul>

            {/* ============ HOME (Personal Info - Editable) ============ */}
            {activeTab === 'home' && (
                <form className="mb-5 rounded-md border border-[#ebedf2] bg-white p-4 dark:border-[#191e3a] dark:bg-black">
                    <h6 className="mb-5 text-lg font-bold">General Information</h6>
                    <div className="flex flex-col sm:flex-row">
                        <div className="mb-5 w-full sm:w-2/12 ltr:sm:mr-4 rtl:sm:ml-4 flex flex-col items-center">
                            <label htmlFor="avatarInput" className={`relative group ${cloudUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                <img src={avatarPreview || '/assets/images/profile-34.jpeg'} alt="avatar" className="mx-auto h-20 w-20 rounded-full object-cover md:h-32 md:w-32" />
                                {!cloudUploading && (
                                    <span className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white opacity-0 group-hover:opacity-100 rounded-full text-xs transition-opacity">
                                        Change
                                    </span>
                                )}
                                {cloudUploading && <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 rounded-full"><span className="loading loading-spinner loading-sm text-white"></span></div>}
                             </label>
                            <input id="avatarInput" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={cloudUploading} />
                            {cloudError && <p className="text-red-500 text-xs mt-1 text-center">{cloudError}</p>}
                         </div>
                        <div className="grid flex-1 grid-cols-1 gap-5 sm:grid-cols-2">
                            {[
                                { id: 'username', label: 'Full Name', placeholder: 'Your Name' },
                                { id: 'profession', label: 'Profession', placeholder: 'Your Role or Title' },
                                { id: 'location', label: 'Location', placeholder: 'City, Country' },
                                { id: 'phone', label: 'Phone', placeholder: '+XX XXXXX XXXXX' },
                                { id: 'email', label: 'Email', placeholder: 'your@email.com', type: 'email', disabled: true }, // Email usually non-editable
                            ].map((f) => (
                                <div key={f.id}>
                                    <label htmlFor={f.id}>{f.label}</label>
                                    <input
                                        id={f.id}
                                        type={f.type || 'text'}
                                        placeholder={f.placeholder}
                                        className={`form-input ${f.disabled ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                                        value={profile[f.id]}
                                        onChange={(e) => handleProfileChange(f.id, e.target.value)}
                                        disabled={f.disabled}
                                    />
                                </div>
                            ))}

                            {/* country + address row */}
                            <div>
                                <label htmlFor="country">Country</label>
                                <select id="country" className="form-select text-white-dark" value={profile.country} onChange={(e) => handleProfileChange('country', e.target.value)}>
                                     {/* Consider a more comprehensive country list component */}
                                    {['', 'United States', 'India', 'Japan', 'China', 'Brazil', 'Norway', 'Canada'].map((c) => (
                                        <option key={c} value={c}>
                                            {c || 'Select Country...'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="address">Address</label>
                                <input id="address" className="form-input" placeholder="Your Address" value={profile.address} onChange={(e) => handleProfileChange('address', e.target.value)} />
                            </div>

                            <div className="mt-3 sm:col-span-2">
                                <button type="button" className="btn btn-primary" onClick={() => saveProfileInfo()}>
                                    Save Profile
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            )}

             {/* ============ COMPANY DETAILS (Read-Only) ============ */}
             {activeTab === 'company' && (
                 <div className="panel max-w-full rounded-md border border-[#ebedf2] bg-white p-6 dark:border-[#191e3a] dark:bg-black">
                     <h6 className="mb-6 text-lg font-bold">Company Information</h6>

                    {/* company logo (display only) */}
                     <div className="mb-6">
                         <label className="block mb-2 font-medium">Company Logo</label>
                         <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded border border-[#cbd5e1] dark:border-[#334155]">
                             {logoPreview ? <img src={logoPreview} alt="Company logo" className="h-full w-full object-contain" /> : <span className="text-xs text-[#94a3b8]">No Logo</span>}
                         </div>
                         {/* No input for logo change */}
                     </div>


                     <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                         {[
                             { id: 'companyName', label: 'Company Name' },
                             { id: 'gst', label: 'GST / VAT No.'},
                             { id: 'regAddress', label: 'Registered Address'},
                             { id: 'contactEmail', label: 'Billing Email' }, // Consider if this should be shown to users
                             { id: 'phone1', label: 'Primary Phone' },
                             { id: 'phone2', label: 'Secondary Phone' },
                         ].map((f) => (
                             <div key={f.id}>
                                 <label htmlFor={f.id}>{f.label}</label>
                                 <input
                                     id={f.id}
                                     type={f.type || 'text'}
                                     className="form-input bg-gray-100 dark:bg-gray-700 cursor-not-allowed" // Style for read-only
                                     value={company[f.id] || 'N/A'} // Display N/A if value is empty
                                     disabled // Make input disabled
                                     readOnly // Ensure value cannot be changed even if JS somehow enables it
                                 />
                             </div>
                         ))}
                     </div>
                     {/* No Save button */}
                 </div>
            )}

            {/* ============ SUBSCRIPTION (Read-Only) ============ */}
             {activeTab === 'subscription' && (
                 <div className="panel max-w-xl rounded-md border border-[#ebedf2] bg-white p-6 dark:border-[#191e3a] dark:bg-black">
                     <h6 className="mb-6 text-lg font-bold">Subscription Plan</h6>

                     <div className="mb-6 flex items-center justify-between">
                         <div>
                             <p className="font-semibold">
                                {subscription.plan || 'N/A'} Plan 
                                <span className={`text-xs ${subscription.status?.toLowerCase() === 'active' ? 'text-success' : 'text-warning'}`}>({subscription.status || 'N/A'})</span>
                            </p>
                             {subscription.expires_at && (
                                 <p className="text-sm text-white-dark">
                                     {subscription.status?.toLowerCase() === 'active' ? 'Renews on' : 'Expires on'} – {new Date(subscription.expires_at).toLocaleDateString()}
                                 </p>
                            )}
                             {!subscription.expires_at && !subscription.plan && (
                                <p className="text-sm text-white-dark">Details not available.</p>
                             )}
                         </div>
                         {/* No Change Plan button */}
                     </div>

                     {/* No Billing History section */}
                 </div>
            )}

            {/* No Danger Zone section */}

        </div>
    );
};

export default UserAccountSettingsTabs; // Renamed component for clarity