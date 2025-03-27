'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2'; 

const LeadForm = ({ existingLead }) => {
  const [formData, setFormData] = useState({
    id: existingLead ? existingLead.id : Math.floor(Math.random() * 100000000),
    full_name: existingLead ? existingLead.full_name : '',
    email: existingLead ? existingLead.email : '',
    phone_number: existingLead ? existingLead.phone_number : '',
    lead_status: existingLead ? existingLead.lead_status : '',
    gender: existingLead ? existingLead.gender : '',
    admin_id: existingLead ? existingLead.admin_id : 'ADM6442',
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

  const router = useRouter();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'; // Replace with your actual API URL

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  console.log(formData);

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    try {
      if (existingLead) {
        // Update existing lead (PUT request)
        await axios.put(`${API_URL}/api/leads/${formData.id}`, formData);
        Swal.fire('Success', 'Lead updated successfully!', 'success').then(() => {
          router.push('/leadtable'); // Redirect to the lead table
        });
      } else {
        // Add new lead (POST request)
        await axios.post(`${API_URL}/api/leads`, formData);
        Swal.fire('Success', 'Lead added successfully!', 'success').then(() => {
          router.push('/leadtable'); // Redirect to the lead table
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
      Swal.fire('Error', 'There was an error submitting the form. Please try again later.', 'error');
    }
  };

  return (
    <div className="form-container p-6 bg-white rounded shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        {existingLead ? 'Edit Lead' : 'Add New Lead'}
      </h2>
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
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
            <option value="new">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Lost">Lost</option>
          </select>
        </div>

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
