'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2'; 
import { getAuth } from "firebase/auth"; // 🔐 Firebase auth
import { fetchFolders, createFolder, errorMessage } from '@/components/Leadtable/leadFolders';

const LeadForm = ({ existingLead }) => {

  const statusOptions = [
    { value: 'Cold Lead', label: 'Cold Lead' },
    { value: 'Hot Lead', label: 'Hot Lead' },
    { value: 'Qualified Lead', label: 'Qualified Lead' },
    { value: 'Lost Lead', label: 'Lost Lead' },
    { value: 'Follow-up', label: 'Follow-up' },
  ];

  
  const [formData, setFormData] = useState({
    id: existingLead ? existingLead.id : Math.floor(Math.random() * 100000000),
    full_name: existingLead ? existingLead.full_name : '',
    email: existingLead ? existingLead.email : '',
    phone_number: existingLead ? existingLead.phone_number : '',
    lead_status: existingLead ? existingLead.lead_status : '',
    gender: existingLead ? existingLead.gender : '',
    date_of_birth: existingLead ? new Date(existingLead.date_of_birth).toLocaleDateString('en-CA') : '',

    address: existingLead ? existingLead.address : '',
    insurance_type: existingLead ? existingLead.insurance_type : '',
    policy_number: existingLead ? existingLead.policy_number : '',
    coverage_amount: existingLead ? existingLead.coverage_amount : '',
    preferred_plan: existingLead ? existingLead.preferred_plan : '',
    next_follow_up_date: existingLead ? existingLead.next_follow_up_date : '',
    source: existingLead ? existingLead.source : '',
    company_name: existingLead ? existingLead.company_name : '',
    referrer: existingLead ? existingLead.referrer : '',
    notes: existingLead ? existingLead.notes : '',
  });

  // My personal folders. A new lead must go into one (?folder= preselects it, e.g. from an empty folder).
  const [folders, setFolders] = useState([]);
  const [folderId, setFolderId] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  useEffect(() => {
    fetchFolders()
      .then((list) => {
        setFolders(list);
        const wanted = new URLSearchParams(window.location.search).get('folder');
        if (wanted && list.some((f) => String(f.id) === wanted)) setFolderId(wanted);
      })
      .catch(() => {});
  }, []);

  const addFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      const created = await createFolder(name);
      setFolders((prev) => [...prev, created]);
      setFolderId(String(created.id));
      setCreatingFolder(false);
      setNewFolderName('');
    } catch (err) {
      Swal.fire('Error', errorMessage(err, 'Could not create the folder.'), 'error');
    }
  };

  const router = useRouter();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'; // Replace with your actual API URL

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  console.log(formData);
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    try {
      const auth = getAuth();
      const user = auth.currentUser;
  
      if (!user) {
        Swal.fire('Unauthorized', 'You must be logged in to submit this form.', 'error');
        return;
      }
  
      if (!existingLead && !folderId) {
        Swal.fire('Folder required', 'Please select a folder for this lead.', 'warning');
        return;
      }

      const token = await user.getIdToken(); // 🔑 Firebase token
  
      const payload = { ...formData };
      if (!existingLead) payload.folder_id = Number(folderId);
      delete payload.admin_id; // ❌ Remove hardcoded ID
  
      if (existingLead) {
        await axios.put(`${API_URL}/api/leads/user/${formData.id}`, payload, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        Swal.fire('Success', 'Lead updated successfully!', 'success').then(() => {
          router.push('/userleadtable');
        });
      } else {
        await axios.post(`${API_URL}/api/leads/user`, payload, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        Swal.fire('Success', 'Lead added successfully!', 'success').then(() => {
          router.push('/userleadtable');
        });
      }
  
      setFormData({
        id: Math.floor(Math.random() * 100000000),
        full_name: '',
        email: '',
        phone_number: '',
        lead_status: '',
        gender: '',
        date_of_birth: '',
        address: '',
        insurance_type: '',
        policy_number: '',
        coverage_amount: '',
        preferred_plan: '',
        next_follow_up_date: '',
        source: '',
        company_name: '',
        referrer: '',
        notes: '',
      });
  
    } catch (error) {
      console.error('Error submitting form:', error);
      Swal.fire('Error', errorMessage(error, 'There was an error submitting the form. Please try again later.'), 'error');
    }
  };

  return (
    <div className="form-container p-6 bg-white rounded shadow-md">
    <h2 className="text-xl font-semibold text-gray-800 mb-6">
      {existingLead ? 'Edit Lead' : 'Add New Lead'}
    </h2>
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Full Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Full Name
        </label>
        <input
          type="text"
          name="full_name"
          placeholder="Enter Full Name"
          value={formData.full_name}
          onChange={handleInputChange}
          className="form-input w-full"
          required
        />
      </div>

      {/* Folder (required for a new lead) */}
      {!existingLead && (
        <div className="min-w-0">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Folder <span className="text-red-500">*</span>
          </label>
          {creatingFolder ? (
            <div className="flex gap-2">
              <input
                type="text"
                className="form-input w-full min-w-0"
                placeholder="New folder name"
                value={newFolderName}
                maxLength={255}
                autoFocus
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addFolder();
                  }
                }}
              />
              <button type="button" className="btn btn-primary" onClick={addFolder} disabled={!newFolderName.trim()}>Add</button>
              <button type="button" className="btn btn-outline-secondary" onClick={() => { setCreatingFolder(false); setNewFolderName(''); }}>Cancel</button>
            </div>
          ) : (
            <select
              name="folder_id"
              value={folderId}
              onChange={(e) => (e.target.value === '__new__' ? setCreatingFolder(true) : setFolderId(e.target.value))}
              className="form-select w-full"
              required
            >
              <option value="" disabled>Select a folder</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
              <option value="__new__">+ Create new folder…</option>
            </select>
          )}
        </div>
      )}

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          name="email"
          placeholder="Enter Email"
          value={formData.email}
          onChange={handleInputChange}
          className="form-input w-full"
          required
        />
      </div>

      {/* Phone Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number
        </label>
        <input
          type="text"
          name="phone_number"
          placeholder="Enter Phone Number"
          value={formData.phone_number}
          onChange={handleInputChange}
          className="form-input w-full"
          required
        />
      </div>

      {/* Lead Status with custom options */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Lead Status
        </label>
        <select
          name="lead_status"
          value={formData.lead_status}
          onChange={handleInputChange}
          className="form-select w-full"
          required
        >
          <option value="">Select Lead Status</option>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Gender */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Gender
        </label>
        <select
          name="gender"
          value={formData.gender}
          onChange={handleInputChange}
          className="form-select w-full"
        >
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
      </div>

      {/* Date of Birth */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date of Birth
        </label>
        <input
          type="date"
          name="date_of_birth"
          value={formData.date_of_birth}
          onChange={handleInputChange}
          className="form-input w-full"
        />
      </div>

      {/* Source */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Source
        </label>
        <input
          type="text"
          name="source"
          placeholder="Enter Lead Source"
          value={formData.source}
          onChange={handleInputChange}
          className="form-input w-full"
        />
      </div>

      {/* Address */}
      <div className="col-span-1 lg:col-span-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address
        </label>
        <textarea
          name="address"
          placeholder="Enter Address"
          value={formData.address}
          onChange={handleInputChange}
          className="form-textarea w-full"
        />
      </div>

      {/* Submit Button */}
      <div className="col-span-1 lg:col-span-3 flex justify-end space-x-3">
        <button type="submit" className="btn btn-primary">
          {existingLead ? 'Update Lead' : 'Add Lead'}
        </button>
      </div>
    </form>
  </div>
  );
};

export default LeadForm;
