'use client'
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import axios from 'axios';
import { showNotification } from '@mantine/notifications';
import 'react-phone-input-2/lib/style.css';
import PhoneInput from 'react-phone-input-2';
import {
  Container,
  Group,
  TextInput,
  PasswordInput,
  Select,
  Textarea,
  Button,
} from '@mantine/core';
import { IconUserPlus, IconMail, IconShieldLock } from '@tabler/icons-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const INITIAL = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: '',
  manager_id: '',
  password: '',
  confirm_password: '',
  fathers_name: '',
  pan: '',
  address: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  birthday: '',
  anniversary: '',
  blood_group: '',
  bank_account_holder: '',
  bank_name: '',
  bank_account_number: '',
  bank_ifsc: '',
};

const mantineInputDarkStyles = {
  input: 'dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:placeholder-gray-400 focus:dark:border-blue-500 focus:dark:ring-blue-500',
  label: 'dark:text-gray-300',
  dropdown: 'dark:bg-gray-700 dark:border-gray-600',
  item: 'dark:text-gray-200 hover:dark:bg-gray-600',
};
const cls = {
  input: mantineInputDarkStyles.input,
  label: mantineInputDarkStyles.label,
  innerInput: mantineInputDarkStyles.input,
  dropdown: mantineInputDarkStyles.dropdown,
  item: mantineInputDarkStyles.item,
};

function PhoneField({ label, value, onChange, error, required }) {
  return (
    <div>
      <label className="mb-[4px] block text-[14px] font-medium leading-[1.55] text-[#212529] dark:text-gray-300">{label}{required && <span className="ml-0.5 text-red-500">*</span>}</label>
      <PhoneInput
        country="in"
        onlyCountries={['us', 'gb', 'in', 'ca', 'au', 'de', 'fr', 'es', 'it', 'br']}
        value={value}
        onChange={onChange}
        enableSearch
        containerClass="!w-full"
        inputClass="form-input !w-full"
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function AddUserPage() {
  const router = useRouter();
  const [userData, setUserData] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [roles, setRoles] = useState([]);
  const [managers, setManagers] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teamLimit, setTeamLimit] = useState(null); // { limit: number | null, used: number }
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Wait for Firebase to restore the admin session before asking for roles.
  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), async (adminUser) => {
      if (!adminUser) return;
      try {
        const token = await adminUser.getIdToken();
        const { data } = await axios.get(`${API_URL}/api/admin/roles`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRoles(data.map((r) => r.name));
        axios.get(`${API_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
          .then(({ data }) => setManagers(data.filter((u) => u.role === 'Manager')))
          .catch(() => {});
        const lim = await axios.get(`${API_URL}/api/admin/team-limit`, { headers: { Authorization: `Bearer ${token}` } });
        setTeamLimit(lim.data);
      } catch (err) {
        showNotification({ title: 'Error', message: err.response?.data?.message || 'Could not load roles.', color: 'red' });
      } finally {
        setRolesLoading(false);
      }
    });
    return unsub;
  }, [API_URL]);

  const set = (name, value) => {
    setUserData((p) => ({ ...p, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  };
  const handleChange = (e) => set(e.target.name, e.target.value);
  const handleUpper = (e) => set(e.target.name, e.target.value.toUpperCase());

  const validate = () => {
    const d = userData;
    const e = {};
    ['first_name', 'last_name', 'email', 'phone', 'role', 'password'].forEach((k) => {
      if (!String(d[k]).trim()) e[k] = 'Required';
    });
    if (d.password !== d.confirm_password) e.confirm_password = 'Passwords do not match';
    if (d.pan && !PAN_RE.test(d.pan)) e.pan = 'Format: ABCDE1234F';
    if (d.bank_ifsc && !IFSC_RE.test(d.bank_ifsc)) e.bank_ifsc = 'Invalid IFSC';
    if (d.bank_account_number && !/^\d{6,30}$/.test(d.bank_account_number)) e.bank_account_number = '6-30 digits only';
    setErrors(e);
    return e;
  };

  const handleSubmit = async () => {
    if (Object.keys(validate()).length) {
      return showNotification({ title: 'Error', message: 'Please fix the highlighted fields.', color: 'red' });
    }
    const { confirm_password, phone, emergency_contact_phone, ...rest } = userData;
    const e164 = (v) => (v ? (v.startsWith('+') ? v : `+${v}`) : '');
    const emergency = emergency_contact_phone && emergency_contact_phone.length > 4 ? e164(emergency_contact_phone) : '';
    setSaving(true);
    try {
      const adminUser = getAuth().currentUser;
      if (!adminUser) throw new Error('Not authenticated');
      const token = await adminUser.getIdToken();
      await axios.post(
        `${API_URL}/api/users`,
        { ...rest, phone: e164(phone), emergency_contact_phone: emergency },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showNotification({ title: 'Success', message: 'User added successfully.', color: 'green' });
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      showNotification({ title: 'Error', message: err.response?.data?.message || err.message, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const limitReached = teamLimit && teamLimit.limit !== null && teamLimit.used >= teamLimit.limit;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Container size="lg" pt={0} pb="xl">
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
          <IconUserPlus size={24} className="text-blue-600 dark:text-blue-400" />
          Add Team Member
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create their login and save their profile details.</p>
      </div>
      {teamLimit && teamLimit.limit !== null && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${limitReached ? 'border-red-200 bg-red-50 text-red-700' : 'border-blue-100 bg-blue-50 text-blue-700'}`}>
          {limitReached
            ? `Team member limit reached (${teamLimit.used} of ${teamLimit.limit}). Contact support to add more members.`
            : `${teamLimit.used} of ${teamLimit.limit} team members added. ${teamLimit.limit - teamLimit.used} left.`}
        </div>
      )}
      <div className="sm:rounded-lg sm:border sm:border-gray-200 sm:bg-white sm:p-6 sm:shadow-sm dark:sm:border-gray-700 dark:sm:bg-gray-800">
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-x-6 sm:gap-y-5">
          <div className="col-span-2 flex items-center gap-3"><span className="h-4 w-1 rounded-full bg-blue-600" /><h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Basic details</h3><span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" /></div>
          <TextInput label="First Name" name="first_name" placeholder="Enter First Name" icon={<IconUserPlus size={16} />}
            value={userData.first_name} onChange={handleChange} error={errors.first_name} required classNames={cls} />
          <TextInput label="Last Name" name="last_name" placeholder="Enter Last Name" icon={<IconUserPlus size={16} />}
            value={userData.last_name} onChange={handleChange} error={errors.last_name} required classNames={cls} />
          <TextInput label="Father's Name" name="fathers_name" placeholder="Enter Father's Name"
            value={userData.fathers_name} onChange={handleChange} classNames={cls} />
          <TextInput label="PAN" name="pan" placeholder="ABCDE1234F" maxLength={10}
            value={userData.pan} onChange={handleUpper} error={errors.pan} classNames={cls} />
          <div className="col-span-2">
            <TextInput label="Email Address" name="email" type="email" placeholder="email@example.com" icon={<IconMail size={16} />}
            value={userData.email} onChange={handleChange} error={errors.email} required classNames={cls} />
          </div>
          <div className="col-span-2">
            <PhoneField label="Phone Number" required value={userData.phone} onChange={(v) => set('phone', v)} error={errors.phone} />
          </div>
          <Select label="Role" placeholder={rolesLoading ? 'Loading roles...' : 'Select role'} data={roles}
            value={userData.role || null} onChange={(v) => set('role', v || '')} error={errors.role}
            nothingFound="No roles available" required classNames={cls} />
          <Select label="Blood Group" placeholder="Select" data={BLOOD_GROUPS} clearable
            value={userData.blood_group || null} onChange={(v) => set('blood_group', v || '')} classNames={cls} />
          {userData.role && userData.role !== 'Manager' && (
            <div className="col-span-2">
              <Select label="Reporting Manager" placeholder={managers.length ? 'Select a manager (optional)' : 'No managers yet'}
                description="This manager will handle this team member"
                data={managers.map((m) => ({ value: String(m.id), label: m.username }))}
                value={userData.manager_id ? String(userData.manager_id) : null} onChange={(v) => set('manager_id', v || '')}
                clearable searchable disabled={!managers.length} nothingFound="No managers" classNames={cls} />
            </div>
          )}
          <TextInput label="Birthday" name="birthday" type="date" max={today}
            value={userData.birthday} onChange={handleChange} classNames={cls} />
          <TextInput label="Anniversary" name="anniversary" type="date" max={today}
            value={userData.anniversary} onChange={handleChange} classNames={cls} />
          <div className="col-span-2">
            <Textarea label="Address" name="address" placeholder="Enter Address" minRows={2} maxLength={500} autosize
            value={userData.address} onChange={handleChange} classNames={cls} style={{ gridColumn: '1 / -1' }} />
          </div>
          <div className="col-span-2 mt-3 flex items-center gap-3"><span className="h-4 w-1 rounded-full bg-blue-600" /><h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Emergency contact</h3><span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" /></div>
          <div className="col-span-2">
            <TextInput label="Emergency Contact Name" name="emergency_contact_name" placeholder="Enter Contact Name"
            value={userData.emergency_contact_name} onChange={handleChange} classNames={cls} />
          </div>
          <div className="col-span-2">
            <PhoneField label="Emergency Contact Number" value={userData.emergency_contact_phone}
            onChange={(v) => set('emergency_contact_phone', v)} />
          </div>
          <div className="col-span-2 mt-3 flex items-center gap-3"><span className="h-4 w-1 rounded-full bg-blue-600" /><h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Bank account</h3><span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" /></div>
          <div className="col-span-2">
            <TextInput label="Bank Account Holder" name="bank_account_holder" placeholder="As per bank records"
            value={userData.bank_account_holder} onChange={handleChange} classNames={cls} />
          </div>
          <TextInput label="Bank Name" name="bank_name" placeholder="Enter Bank Name"
            value={userData.bank_name} onChange={handleChange} classNames={cls} />
          <TextInput label="IFSC Code" name="bank_ifsc" placeholder="SBIN0001234" maxLength={11}
            value={userData.bank_ifsc} onChange={handleUpper} error={errors.bank_ifsc} classNames={cls} />
          <div className="col-span-2">
            <TextInput label="Bank Account Number" name="bank_account_number" placeholder="Enter Account Number" inputMode="numeric" maxLength={30}
            value={userData.bank_account_number} onChange={(e) => set('bank_account_number', e.target.value.replace(/\D/g, ''))}
            error={errors.bank_account_number} classNames={cls} />
          </div>
          <div className="col-span-2 mt-3 flex items-center gap-3"><span className="h-4 w-1 rounded-full bg-blue-600" /><h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Login</h3><span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" /></div>
          <PasswordInput label="Password" name="password" placeholder="Enter Password" icon={<IconShieldLock size={16} />}
            value={userData.password} onChange={handleChange} error={errors.password} required classNames={cls} />
          <PasswordInput label="Confirm Password" name="confirm_password" placeholder="Confirm Password" icon={<IconShieldLock size={16} />}
            value={userData.confirm_password} onChange={handleChange} error={errors.confirm_password} required classNames={cls} />
        </div>
        <Group position="right" mt="xl">
          <Button size="md" onClick={handleSubmit} loading={saving} disabled={limitReached}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white">
            Save
          </Button>
        </Group>
      </div>
    </Container>
  );
}
