'use client';

import { useState } from 'react';

const LeadForm = ({ existingLead, onClose }) => {
  const [formData, setFormData] = useState({
    id: existingLead ? existingLead.id : Date.now(),
    full_name: existingLead ? existingLead.full_name : '',
    email: existingLead ? existingLead.email : '',
    phone_number: existingLead ? existingLead.phone_number : '',
    lead_status: existingLead ? existingLead.lead_status : '',
    gender: existingLead ? existingLead.gender : '',
    date_of_birth: existingLead ? existingLead.date_of_birth : '',
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

  const loadLeadsFromLocalStorage = () => {
    const storedLeads = localStorage.getItem('leads');
    return storedLeads ? JSON.parse(storedLeads) : [];
  };

  const saveLeadsToLocalStorage = (leads) => {
    localStorage.setItem('leads', JSON.stringify(leads));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const currentLeads = loadLeadsFromLocalStorage();

    if (existingLead) {
      const updatedLeads = currentLeads.map((lead) =>
        lead.id === formData.id ? formData : lead
      );
      saveLeadsToLocalStorage(updatedLeads);
    } else {
      const newLeads = [...currentLeads, formData];
      saveLeadsToLocalStorage(newLeads);
      alert('Lead added successfully!');
    }

    setFormData({
      id: Date.now(),
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
    onClose();
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
            <option value="New">New</option>
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

        {/* Add other input fields similarly */}

        <div className="col-span-1 lg:col-span-3 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {existingLead ? 'Update Lead' : 'Add Lead'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LeadForm;
