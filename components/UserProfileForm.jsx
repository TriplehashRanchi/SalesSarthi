'use client';
import React, { useState, useEffect } from 'react';
import IconHome from '@/components/icon/icon-home';
import IconDollarSignCircle from '@/components/icon/icon-dollar-sign-circle';
import IconUser from '@/components/icon/icon-user';
import IconPhone from '@/components/icon/icon-phone';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { useCloudinaryUpload } from '@/utils/useCloudinaryUpload';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { IconAlertTriangle } from '@tabler/icons-react';


const AccountSettingsTabs = () => {
    const [activeTab, setActiveTab] = useState('home');
    const { upload: cloudUpload, uploading: cloudUploading, error: cloudError } = useCloudinaryUpload();

    // ───── personal profile state ─────
    const [profile, setProfile] = useState({
        name: '',
        profession: '',
        location: '',
        phone: '',
        email: '',
        country: '',
        address: '',
        avatar: null, // File or URL
    });
    const [avatarPreview, setAvatarPreview] = useState(null);

    // ───── company state ─────
    const [company, setCompany] = useState({
        companyName: '',
        gst: '',
        regAddress: '',
        contactEmail: '',
        phone1: '',
        phone2: '',
        logo_url: '',
    });

    // ── subscription + transactions state ──
    const [subscription, setSubscription] = useState({
        plan: '',
        status: '',
        expires_at: '',
    });
    const [transactions, setTransactions] = useState([]);

    const [logoPreview, setLogoPreview] = useState(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    // ───── load existing data ─────
    useEffect(() => {
        (async () => {
            try {
                const token = await getAuth().currentUser.getIdToken();

                // load personal
                const { data: admin } = await axios.get(`${API_URL}/api/admin/me`, { headers: { Authorization: `Bearer ${token}` } });
                setProfile({
                    name: admin.name || '',
                    profession: admin.profession || '',
                    location: admin.location || '',
                    phone: admin.phone || '',
                    email: admin.email || '',
                    country: admin.country || '',
                    address: admin.address || '',
                    avatar: admin.avatar_url || null,
                });
                if (admin.avatar_url) setAvatarPreview(admin.avatar_url);
                // pull subscription info into state
                setSubscription({
                    plan: admin.subscription_plan,
                    status: admin.subscription_status,
                    expires_at: admin.expires_at,
                });
                // load company
                const { data: comp } = await axios.get(`${API_URL}/api/companies/me`, { headers: { Authorization: `Bearer ${token}` } });
                setCompany({
                    companyName: comp.name || '',
                    gst: comp.gst_number || '',
                    regAddress: comp.address || '',
                    contactEmail: comp.billing_email || '',
                    phone1: comp.phone_1 || '',
                    phone2: comp.phone_2 || '',
                });
                if (comp.logo_url) setLogoPreview(comp.logo_url);
                // load transaction history
                const { data: txns } = await axios.get(`${API_URL}/api/admin/transactions`, { headers: { Authorization: `Bearer ${token}` } });
                setTransactions(txns);
            } catch (err) {
                console.error(err);
                // optionally show notification
            }
        })();
    }, []);

    // ───── handlers ───── //
    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            // upload to Cloudinary
            const url = await cloudUpload(file);
            setProfile((p) => ({ ...p, avatar: url }));
            setAvatarPreview(url);
        } catch (err) {
            console.error('Avatar upload failed', err);
        }
    };
    const handleProfileChange = (id, val) => {
        setProfile((p) => ({ ...p, [id]: val }));
    };

    const saveProfileInfo = async () => {
        try {
            const token = await getAuth().currentUser.getIdToken();
            const avatar_url = profile.avatar; // already a URL from the hook

            await axios.put(
                `${API_URL}/api/admin/me`,
                {
                    name: profile.name,
                    profession: profile.profession,
                    location: profile.location,
                    phone: profile.phone,
                    email: profile.email,
                    country: profile.country,
                    address: profile.address,
                    avatar_url,
                },
                { headers: { Authorization: `Bearer ${token}` } },
            );
            alert('Profile saved');
        } catch (err) {
            console.error(err);
            alert('Error saving profile');
        }
    };

    const handleLogoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const url = await cloudUpload(file);
            setCompany((c) => ({ ...c, logo_url: url }));
            setLogoPreview(url);
        } catch (err) {
            console.error('Logo upload failed', err);
        }
    };
    const handleCompanyChange = (id, val) => {
        setCompany((c) => ({ ...c, [id]: val }));
    };
    const saveCompanyInfo = async () => {
        try {
            const token = await getAuth().currentUser.getIdToken();
            // now everything is plain JSON, including logo_url
            await axios.put(
                `${API_URL}/api/companies/me`,
                {
                    name: company.companyName,
                    gst_number: company.gst,
                    address: company.regAddress,
                    billing_email: company.contactEmail,
                    phone_1: company.phone1,
                    phone_2: company.phone2,
                    logo_url: company.logo_url,
                },
                { headers: { Authorization: `Bearer ${token}` } },
            );
            alert('Company info saved');
        } catch (err) {
            console.error(err);
            alert('Error saving company info');
        }
    };

    return (
        <div className="pt-5">
            {/* header */}
            <div className="mb-5 flex items-center justify-between">
                <h5 className="text-lg font-semibold dark:text-white-light">Settings</h5>
            </div>

            {/* tab nav */}
            <ul className="mb-5 overflow-y-auto whitespace-nowrap border-b border-[#ebedf2] font-semibold dark:border-[#191e3a] sm:flex">
                {[
                    { id: 'home', label: 'Home', icon: <IconHome /> },
                    { id: 'subscription', label: 'Subscription', icon: <IconDollarSignCircle /> },
                    { id: 'company', label: 'Company Details', icon: <IconUser className="h-5 w-5" /> },
                    { id: 'danger-zone', label: 'Danger Zone', icon: <IconAlertTriangle /> },
                ].map((t) => (
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

            {/* ============ HOME ============ */}
            {activeTab === 'home' && (
                <form className="mb-5 rounded-md border border-[#ebedf2] bg-white p-4 dark:border-[#191e3a] dark:bg-black">
                    <h6 className="mb-5 text-lg font-bold">General Information</h6>
                    <div className="flex flex-col sm:flex-row">
                        <div className="mb-5 w-full sm:w-2/12 ltr:sm:mr-4 rtl:sm:ml-4">
                            <label htmlFor="avatarInput">
                                <img src={avatarPreview || '/assets/images/profile-34.jpeg'} alt="avatar" className="mx-auto h-20 w-20 rounded-full object-cover md:h-32 md:w-32 cursor-pointer" />
                            </label>
                            <input id="avatarInput" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                        </div>
                        <div className="grid flex-1 grid-cols-1 gap-5 sm:grid-cols-2">
                            {[
                                { id: 'name', label: 'Full Name', placeholder: 'Your Name ' },
                                { id: 'profession', label: 'Profession', placeholder: 'Enter Your Profession' },
                                { id: 'location', label: 'Location', placeholder: 'Location' },
                                { id: 'phone', label: 'Phone', placeholder: '+91 98755-XXXXX' },
                                { id: 'email', label: 'Email', placeholder: 'jimmy@example.com', type: 'email' },
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
                                            inputProps={{
                                                id: f.id,
                                                placeholder: f.placeholder,
                                            }}
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

                            {/* country + address row */}
                            <div>
                                <label htmlFor="country">Country</label>
                                <select
                                    id="country"
                                    className="form-select text-white-dark"
                                    value={profile.country}
                                    onChange={(e) => handleProfileChange('country', e.target.value)}
                                    placeholder="Select Country"
                                >
                                    {['All Countries', 'United States', 'India', 'Japan', 'China', 'Brazil', 'Norway', 'Canada'].map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="address">Address</label>
                                <input id="address" className="form-input" placeholder="Enter Your Address" value={profile.address} onChange={(e) => handleProfileChange('address', e.target.value)} />
                            </div>

                            <div className="mt-3 sm:col-span-2">
                                <button type="button" className="btn btn-primary" onClick={saveProfileInfo}>
                                    Save Profile
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            )}

            {/* ============ SUBSCRIPTION ============ */}
            {activeTab === 'subscription' && (
                <div className="panel max-w-xl rounded-md border border-[#ebedf2] bg-white p-6 dark:border-[#191e3a] dark:bg-black">
                    <h6 className="mb-6 text-lg font-bold">Your Plan</h6>

                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <p className="font-semibold">
                                {subscription.subscription_plan || 'Basic'} Plan&nbsp;
                                <span className="text-xs text-white-dark">({subscription.subscription_status || 'Active'})</span>
                            </p>
                            <p className="text-sm text-white-dark">Next renewal – {new Date(subscription.expires_at).toLocaleDateString()}</p>
                        </div>
                        <button className="btn btn-dark">Change&nbsp;Plan</button>
                    </div>

                    <h6 className="mb-4 text-lg font-bold">Billing History</h6>
                    <div className="space-y-3">
                        {transactions &&
                            transactions.map((row) => (
                                <div key={row.txn_id} className="flex justify-between border-b border-[#ebedf2] py-2 dark:border-[#1b2e4b]">
                                    <span>{new Date(row.txn_date).toLocaleDateString()}</span>
                                    <span>
                                        {row.currency} {row.amount.toFixed(2)}
                                    </span>
                                    <span className={row.status === 'Success' ? 'text-green-500' : row.status === 'Pending' ? 'text-yellow-500' : 'text-red-500'}>{row.status}</span>
                                </div>
                            ))}
                        {transactions.length === 0 && <p className="text-center text-white-dark">No transactions found.</p>}
                    </div>
                </div>
            )}

            {/* ============ COMPANY DETAILS ============ */}
            {activeTab === 'company' && (
                <form className="panel max-w-full rounded-md border border-[#ebedf2] bg-white p-6 dark:border-[#191e3a] dark:bg-black">
                    <h6 className="mb-6 text-lg font-bold">Company Information</h6>

                    {/* company logo */}
                    <div className="mb-6">
                        <label htmlFor="companyLogo" className="block mb-2 font-medium">
                            Company Logo
                        </label>
                        <label
                            htmlFor="companyLogo"
                            className="flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded border-2 border-dashed border-[#cbd5e1] dark:border-[#334155] hover:border-primary"
                        >
                            {logoPreview ? <img src={logoPreview} alt="logo" className="h-full w-full object-cover" /> : <span className="text-xs text-[#94a3b8]">Add Logo</span>}
                        </label>
                        <input id="companyLogo" type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        {[
                            { id: 'companyName', label: 'Company Name', placeholder: 'Acme Corp.' },
                            { id: 'gst', label: 'GST / VAT No.', placeholder: '22AAAAA0000A1Z5' },
                            { id: 'regAddress', label: 'Registered Address', placeholder: 'Street, City' },
                            {
                                id: 'contactEmail',
                                label: 'Billing Email',
                                type: 'email',
                                placeholder: 'accounts@acme.com',
                            },
                            { id: 'phone1', label: 'Primary Phone', placeholder: '+91 98765 43210' },
                            { id: 'phone2', label: 'Secondary Phone', placeholder: '+91 91234 56789' },
                        ].map((f) => (
                            <div key={f.id}>
                                <label htmlFor={f.id}>{f.label}</label>
                                {f.id === 'phone1' || f.id === 'phone2' ? (
                                    <PhoneInput
                                        inputClass="form-input"
                                        country="in"
                                        value={company[f.id]}
                                        onChange={(phone) => handleCompanyChange(f.id, phone)}
                                    />
                                ) : (
                                    <input
                                    id={f.id}
                                    type={f.type || 'text'}
                                    placeholder={f.placeholder}
                                    className="form-input"
                                    value={company[f.id]}
                                    onChange={(e) => handleCompanyChange(f.id, e.target.value)}
                                />
                                )
                                }
                              
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 text-right">
                        <button type="button" className="btn btn-primary" onClick={saveCompanyInfo}>
                            Save Company Info
                        </button>
                    </div>
                </form>
            )}

            {/* ============ DANGER ZONE ============ */}
            {activeTab === 'danger-zone' && (
                <div className="panel max-w-xl space-y-5 rounded-md border border-[#ebedf2] bg-white p-6 dark:border-[#191e3a] dark:bg-black">
                    <h6 className="text-lg font-bold">Danger Zone</h6>
                    <p className="text-sm">Once you delete the account, there is no going back. Please be certain.</p>
                    <button className="btn btn-danger">Delete my account</button>
                </div>
            )}
        </div>
    );
};

export default AccountSettingsTabs;
