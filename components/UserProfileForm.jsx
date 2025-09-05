'use client';
import React, { useState, useEffect, useMemo } from 'react';
import IconHome from '@/components/icon/icon-home';
import IconDollarSignCircle from '@/components/icon/icon-dollar-sign-circle';
import IconUser from '@/components/icon/icon-user';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { useCloudinaryUpload } from '@/utils/useCloudinaryUpload';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { IconAlertTriangle } from '@tabler/icons-react';
import Link from 'next/link';

/** ───────────────────────── helpers: E.164 ───────────────────────── **/
const toE164 = (raw) => {
    const digits = String(raw ?? '').replace(/\D/g, '');
    if (!digits) return '';
    return `+${digits}`;
};
const isValidE164 = (value) => /^\+[1-9]\d{1,14}$/.test(String(value || ''));

/** react-phone-input-2 prefers digits (no '+'). Convert for UI binding */
const e164ToDigits = (e164) => String(e164 || '').replace(/^\+/, ''); // for <PhoneInput value>
const digitsToE164 = (digits) => toE164(digits); // for state / API

const AccountSettingsTabs = () => {
    const [activeTab, setActiveTab] = useState('home');
    const { upload: cloudUpload, uploading: cloudUploading } = useCloudinaryUpload();

    // ───── personal profile state ─────
    const [profile, setProfile] = useState({
        name: '',
        profession: '',
        location: '',
        phone: '', // store E.164 (e.g., +9198...)
        email: '',
        country: '',
        address: '',
        avatar: null,
        website: '',
    });
    const [profileErrors, setProfileErrors] = useState({ phone: '' });
    const [avatarPreview, setAvatarPreview] = useState(null);

    // ───── company state ─────
    const [company, setCompany] = useState({
        companyName: '',
        gst: '',
        regAddress: '',
        contactEmail: '',
        phone1: '', // E.164
        phone2: '', // E.164
        logo_url: '',
    });
    const [companyErrors, setCompanyErrors] = useState({ phone1: '', phone2: '' });
    const [logoPreview, setLogoPreview] = useState(null);

    // ── subscription + transactions state ──
    const [subscription, setSubscription] = useState({ plan: '', status: '', expires_at: '' });
    const [transactions, setTransactions] = useState([]);

    const [loading, setLoading] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingCompany, setSavingCompany] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    // ───── load existing data ─────
    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const token = await getAuth().currentUser.getIdToken();

                // load personal
                const { data: admin } = await axios.get(`${API_URL}/api/admin/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const normalizedAdminPhone = isValidE164(admin.phone) ? admin.phone : toE164(admin.phone);

                setProfile({
                    name: admin.name || '',
                    profession: admin.profession || '',
                    location: admin.location || '',
                    phone: normalizedAdminPhone || '',
                    email: admin.email || '',
                    country: admin.country || '',
                    address: admin.address || '',
                    avatar: admin.avatar_url || null,
                    website: admin.website || '',
                });
                if (admin.avatar_url) setAvatarPreview(admin.avatar_url);

                setSubscription({
                    plan: admin.subscription_plan || 'Basic',
                    status: admin.subscription_status || 'Active',
                    expires_at: admin.expires_at || '',
                });

                // load company
                const { data: comp } = await axios.get(`${API_URL}/api/companies/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const normPhone1 = isValidE164(comp.phone_1) ? comp.phone_1 : toE164(comp.phone_1);
                const normPhone2 = isValidE164(comp.phone_2) ? comp.phone_2 : toE164(comp.phone_2);

                setCompany({
                    companyName: comp.name || '',
                    gst: comp.gst_number || '',
                    regAddress: comp.address || '',
                    contactEmail: comp.billing_email || '',
                    phone1: normPhone1 || '',
                    phone2: normPhone2 || '',
                    logo_url: comp.logo_url || '',
                });
                if (comp.logo_url) setLogoPreview(comp.logo_url);

                // load transaction history
                const { data: txns } = await axios.get(`${API_URL}/api/admin/transactions`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setTransactions(txns || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        })();
    }, [API_URL]);

    // ───── handlers ───── //
    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const url = await cloudUpload(file);
            setProfile((p) => ({ ...p, avatar: url }));
            setAvatarPreview(url);
        } catch (err) {
            console.error('Avatar upload failed', err);
        }
    };

    const handleProfileChange = (id, val) => {
        setProfile((p) => ({ ...p, [id]: val }));
        if (id === 'phone') {
            const msg = !val ? '' : isValidE164(val) ? '' : 'Enter a valid phone like +919876543210';
            setProfileErrors((e) => ({ ...e, phone: msg }));
        }
    };

    const validateProfile = () => {
        const errs = { phone: '' };
        if (profile.phone && !isValidE164(profile.phone)) {
            errs.phone = 'Enter a valid phone like +919876543210';
        }
        setProfileErrors(errs);
        return !errs.phone;
    };

    const saveProfileInfo = async () => {
        // normalize & validate phone before sending
        const normalizedPhone = toE164(profile.phone);
        const nextProfile = { ...profile, phone: normalizedPhone };
        const ok = isValidE164(nextProfile.phone) || nextProfile.phone === '';
        if (!ok) {
            setProfileErrors((e) => ({ ...e, phone: 'Phone must be E.164, e.g., +919876543210' }));
            return;
        }

        try {
            setSavingProfile(true);
            const token = await getAuth().currentUser.getIdToken();
            await axios.put(
                `${API_URL}/api/admin/me`,
                {
                    name: nextProfile.name,
                    profession: nextProfile.profession,
                    location: nextProfile.location,
                    phone: nextProfile.phone || null, // send null if empty
                    email: nextProfile.email,
                    country: nextProfile.country,
                    address: nextProfile.address,
                    avatar_url: nextProfile.avatar,
                    website: nextProfile.website,
                },
                { headers: { Authorization: `Bearer ${token}` } },
            );
            // success toast alternative:
            alert('Profile saved');
        } catch (err) {
            console.error('Error saving profile', err);
            alert('Error saving profile');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleLogoChange = async (e) => {
        const file = e.target.files?.[0];
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
        if (id === 'phone1' || id === 'phone2') {
            const msg = !val ? '' : isValidE164(val) ? '' : 'Enter a valid phone like +919876543210';
            setCompanyErrors((e) => ({ ...e, [id]: msg }));
        }
    };

    const validateCompany = () => {
        const errs = { phone1: '', phone2: '' };
        if (company.phone1 && !isValidE164(company.phone1)) errs.phone1 = 'Enter a valid phone like +919876543210';
        if (company.phone2 && !isValidE164(company.phone2)) errs.phone2 = 'Enter a valid phone like +919876543210';
        setCompanyErrors(errs);
        return !errs.phone1 && !errs.phone2;
    };

    const saveCompanyInfo = async () => {
        // normalize & validate both phones
        const next = {
            ...company,
            phone1: toE164(company.phone1),
            phone2: toE164(company.phone2),
        };
        const ok1 = isValidE164(next.phone1) || next.phone1 === '';
        const ok2 = isValidE164(next.phone2) || next.phone2 === '';
        if (!ok1 || !ok2) {
            setCompanyErrors({
                phone1: ok1 ? '' : 'Enter a valid phone like +919876543210',
                phone2: ok2 ? '' : 'Enter a valid phone like +919876543210',
            });
            return;
        }

        try {
            setSavingCompany(true);
            const token = await getAuth().currentUser.getIdToken();
            await axios.put(
                `${API_URL}/api/companies/me`,
                {
                    name: next.companyName,
                    gst_number: next.gst,
                    address: next.regAddress,
                    billing_email: next.contactEmail,
                    phone_1: next.phone1 || null,
                    phone_2: next.phone2 || null,
                    logo_url: next.logo_url,
                },
                { headers: { Authorization: `Bearer ${token}` } },
            );
            alert('Company info saved');
        } catch (err) {
            console.error(err);
            alert('Error saving company info');
        } finally {
            setSavingCompany(false);
        }
    };

    // computed disabled flags
    const profileDisabled = useMemo(() => {
        return savingProfile || !!profileErrors.phone || (profile.phone && !isValidE164(profile.phone)) || cloudUploading;
    }, [savingProfile, profileErrors.phone, profile.phone, cloudUploading]);

    const companyDisabled = useMemo(() => {
        const invalid1 = company.phone1 && !isValidE164(company.phone1);
        const invalid2 = company.phone2 && !isValidE164(company.phone2);
        return savingCompany || invalid1 || invalid2 || cloudUploading;
    }, [savingCompany, company.phone1, company.phone2, cloudUploading]);

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
                    { id: 'danger-zone', label: 'Danger Zone', icon: <IconAlertTriangle />, className: 'hidden md:inline-block' },
                ].map((t) => (
                    <li key={t.id} className={`inline-block ${t.className || ''}`}>
                        <button
                            onClick={() => setActiveTab(t.id)}
                            className={`md:flex gap-2 border-b border-transparent p-4 hover:border-primary hover:text-primary ${activeTab === t.id ? '!border-primary text-primary' : ''}`}
                        >
                            {t.icon}
                            {t.label}
                        </button>
                    </li>
                ))}
            </ul>

            {/* ============ HOME ============ */}
            {activeTab === 'home' && (
                <form className="mb-5 rounded-md border border-[#ebedf2] bg-white p-4 dark:border-[#191e3a] dark:bg-black" onSubmit={(e) => e.preventDefault()}>
                    <h6 className="mb-5 text-lg font-bold">General Information</h6>

                    {loading ? (
                        <div className="py-8 text-center text-white-dark">Loading…</div>
                    ) : (
                        <div className="flex flex-col sm:flex-row">
                            <div className="mb-5 w-full sm:w-2/12 ltr:sm:mr-4 rtl:sm:ml-4">
                                <label htmlFor="avatarInput">
                                    <img src={avatarPreview || '/assets/images/image.png'} alt="avatar" className="mx-auto h-20 w-20 rounded-full object-cover md:h-32 md:w-32 cursor-pointer" />
                                </label>
                                <input id="avatarInput" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                            </div>

                            <div className="grid flex-1 grid-cols-1 gap-5 sm:grid-cols-2">
                                {[
                                    { id: 'name', label: 'Full Name', placeholder: 'Your Name ' },
                                    { id: 'profession', label: 'Profession', placeholder: 'Enter Your Profession' },
                                    { id: 'location', label: 'Location', placeholder: 'Location' },
                                    { id: 'email', label: 'Email', placeholder: 'jimmy@example.com', type: 'email' },
                                ].map((f) => (
                                    <div key={f.id}>
                                        <label htmlFor={f.id}>{f.label}</label>
                                        <input
                                            id={f.id}
                                            type={f.type || 'text'}
                                            placeholder={f.placeholder}
                                            className="form-input"
                                            value={profile[f.id]}
                                            onChange={(e) => handleProfileChange(f.id, e.target.value)}
                                        />
                                    </div>
                                ))}

                                {/* phone */}

                                {/* country + address */}
                                <div>
                                    <label htmlFor="country">Country</label>
                                    <select id="country" className="form-select text-white-dark" value={profile.country} onChange={(e) => handleProfileChange('country', e.target.value)}>
                                        {['All Countries', 'United States', 'India', 'Japan', 'China', 'Brazil', 'Norway', 'Canada'].map((c) => (
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
                                        placeholder="Enter Your Address"
                                        value={profile.address}
                                        onChange={(e) => handleProfileChange('address', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="website">Website</label>
                                    <input
                                        id="website"
                                        className="form-input"
                                        placeholder="Enter Your Website"
                                        value={profile.website}
                                        onChange={(e) => handleProfileChange('website', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="phone">Phone</label>
                                    <PhoneInput
                                        id="phone"
                                        country={'in'}
                                        onlyCountries={['in']}
                                        disableDropdown={true}
                                        value={e164ToDigits(profile.phone)}
                                        onChange={(digits) => handleProfileChange('phone', digitsToE164(digits))}
                                        inputProps={{ name: 'phone', placeholder: '98765 43210' }}
                                        inputClass={`form-input w-full ${profileErrors.phone ? '!border-red-500' : ''}`}
                                    />
                                    {profileErrors.phone && <p className="mt-1 text-xs text-red-500">{profileErrors.phone}</p>}
                                </div>

                                <div className="mt-3 sm:col-span-2">
                                    <button
                                        type="button"
                                        className={`btn btn-primary ${profileDisabled ? 'btn-disabled opacity-60 cursor-not-allowed' : ''}`}
                                        onClick={() => {
                                            if (!validateProfile()) return;
                                            saveProfileInfo();
                                        }}
                                        disabled={profileDisabled}
                                        title={profileDisabled ? 'Fix phone format to save' : 'Save Profile'}
                                    >
                                        {savingProfile ? 'Saving…' : 'Save Profile'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </form>
            )}

            {/* ============ SUBSCRIPTION ============ */}
            {activeTab === 'subscription' && (
                <div className="panel max-w-xl rounded-md border border-[#ebedf2] bg-white p-6 dark:border-[#191e3a] dark:bg-black">
                    <h6 className="mb-6 text-lg font-bold">Your Plan</h6>

                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <p className="font-semibold">
                                {subscription?.plan || 'Basic'} Plan&nbsp;
                                <span className="text-xs text-white-dark">({subscription?.status || 'Active'})</span>
                            </p>
                            <p className="text-sm text-white-dark">Next renewal – {subscription?.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : '—'}</p>
                        </div>

                        {/* Desktop: Change Plan button */}
                        <Link href="/payment" className="hidden sm:inline-flex btn btn-dark">
                            Change&nbsp;Plan
                        </Link>

                        {/* Mobile: WhatsApp button */}
                        <a
                            href="https://wa.me/917011979448?text=I%20want%20to%20renew%20my%20subscription"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sm:hidden px-3 py-2 rounded-md text-sm font-medium bg-[#25D366] text-white hover:opacity-90"
                        >
                            Contact Customer Support
                        </a>
                    </div>

                    {/* Mobile-only support info */}
                    <div className="sm:hidden my-3 rounded-md bg-gray-100 dark:bg-gray-800 p-3 text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                        <p>
                            Visit{' '}
                            <a href="https://app.digitalgyanisaarthi.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                                app.digitalgyanisaarthi.com
                            </a>{' '}
                            to manage your subscription.
                        </p>
                        <p className="my-2">
                            For support, contact us at:{' '}
                            <a href="tel:+919266683105" className="underline">
                                9266683105
                            </a>
                            ,{' '}
                            <a href="tel:+919266683106" className="underline">
                                9266683106
                            </a>
                            ,{' '}
                            <a href="tel:+919266683103" className="underline">
                                9266683103
                            </a>
                        </p>
                    </div>

                    <h6 className="mb-4 text-lg font-bold">Billing History</h6>
                    <div className="space-y-3">
                        {transactions?.length > 0 ? (
                            transactions.map((row) => (
                                <div key={row.txn_id} className="flex justify-between border-b border-[#ebedf2] py-2 dark:border-[#1b2e4b]">
                                    <span>{new Date(row.txn_date).toLocaleDateString()}</span>
                                    <span>
                                        {row.currency} {row.amount}
                                    </span>
                                    <span className={row.status === 'Success' ? 'text-green-500' : row.status === 'Pending' ? 'text-yellow-500' : 'text-red-500'}>{row.status}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-white-dark">No transactions found.</p>
                        )}
                    </div>
                </div>
            )}

            {/* ============ COMPANY DETAILS ============ */}
            {activeTab === 'company' && (
                <form className="panel max-w-full rounded-md border border-[#ebedf2] bg-white p-6 dark:border-[#191e3a] dark:bg-black" onSubmit={(e) => e.preventDefault()}>
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
                            { id: 'contactEmail', label: 'Billing Email', type: 'email', placeholder: 'accounts@acme.com' },
                        ].map((f) => (
                            <div key={f.id}>
                                <label htmlFor={f.id}>{f.label}</label>
                                <input
                                    id={f.id}
                                    type={f.type || 'text'}
                                    placeholder={f.placeholder}
                                    className="form-input"
                                    value={company[f.id]}
                                    onChange={(e) => handleCompanyChange(f.id, e.target.value)}
                                />
                            </div>
                        ))}

                        {/* phone1 */}
                       <div>
                            <label htmlFor="phone1">Primary Phone</label>
                            <PhoneInput
                                id="phone1"
                                country={'in'}
                                onlyCountries={['in']}
                                disableDropdown={true}
                                value={e164ToDigits(company.phone1)}
                                onChange={(digits) => handleCompanyChange('phone1', digitsToE164(digits))}
                                inputProps={{ name: 'phone1', placeholder: '98765 43210' }}
                                inputClass={`form-input w-full ${companyErrors.phone1 ? '!border-red-500' : ''}`}
                            />
                            {companyErrors.phone1 && <p className="mt-1 text-xs text-red-500">{companyErrors.phone1}</p>}
                        </div>

                        {/* phone2 */}
                       <div>
                            <label htmlFor="phone2">Secondary Phone</label>
                            <PhoneInput
                                id="phone2"
                                country={'in'}
                                onlyCountries={['in']}
                                disableDropdown={true}
                                value={e164ToDigits(company.phone2)}
                                onChange={(digits) => handleCompanyChange('phone2', digitsToE164(digits))}
                                inputProps={{ name: 'phone2', placeholder: '91234 56789' }}
                                inputClass={`form-input w-full ${companyErrors.phone2 ? '!border-red-500' : ''}`}
                            />
                            {companyErrors.phone2 && <p className="mt-1 text-xs text-red-500">{companyErrors.phone2}</p>}
                        </div>
                    </div>

                    <div className="mt-6 text-right">
                        <button
                            type="button"
                            className={`btn btn-primary ${companyDisabled ? 'btn-disabled opacity-60 cursor-not-allowed' : ''}`}
                            onClick={() => {
                                if (!validateCompany()) return;
                                saveCompanyInfo();
                            }}
                            disabled={companyDisabled}
                            title={companyDisabled ? 'Fix phone format to save' : 'Save Company Info'}
                        >
                            {savingCompany ? 'Saving…' : 'Save Company Info'}
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
