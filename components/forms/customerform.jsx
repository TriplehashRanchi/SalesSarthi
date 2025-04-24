'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

const CustomerForm = ({ customerData, onSubmit }) => {
  const [formData, setFormData] = useState({
    id: customerData ? customerData.id : Math.floor(Math.random() * 100000000),
    full_name: customerData ? customerData.full_name : '',
    email: customerData ? customerData.email : '',
    phone_number: customerData ? customerData.phone_number : '',
    gender: customerData ? customerData.gender : '',
    date_of_birth: customerData ? new Date(customerData.date_of_birth).toLocaleDateString('en-CA') : '',
    anniversary: customerData ?new Date(customerData.anniversary).toLocaleDateString('en-CA') : '',
    address: customerData ? customerData.address : '',
    company_name: customerData ? customerData.company_name : '',
    product_name: customerData ? customerData.product_name : '',
    policy_number: customerData ? customerData.policy_number : '',
    premium: customerData ? customerData.premium : '',
    coverage_amount: customerData ? customerData.coverage_amount : '',
    renewal_date: customerData ? customerData.renewal_date : '',
    status: customerData ? customerData.status : 'Active',
    source: customerData ? customerData.source : '',
    referrer: customerData ? customerData.referrer : '',
    notes: customerData ? customerData.notes : '',
  });

  console.log(customerData)

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onSubmit(formData);  // Calls the passed onSubmit function with formData
      Swal.fire('Success', 'Customer data processed successfully!', 'success');
      setFormData({
        id: Math.floor(Math.random() * 100000000),
        full_name: '',
        email: '',
        phone_number: '',
        gender: '',
        date_of_birth: '',
        anniversary: '',
        address: '',
        company_name: '',
        product_name: '',
        policy_number: '',
        premium: '',
        coverage_amount: '',
        renewal_date: '',
        status: 'Active',
        source: '',
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
        {customerData ? 'Edit Customer' : 'Add New Customer'}
      </h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="tel"
            name="phone_number"
            placeholder="Enter Phone Number"
            value={formData.phone_number}
            onChange={handleInputChange}
            className="form-input w-full"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
          <input
            type="date"
            name="date_of_birth"
            value={formData.date_of_birth}
            onChange={handleInputChange}
            className="form-input w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Anniversary</label>
          <input
            type="date"
            name="anniversary"
            value={formData.anniversary}
            onChange={handleInputChange}
            className="form-input w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <textarea
            name="address"
            placeholder="Enter Address"
            value={formData.address}
            onChange={handleInputChange}
            className="form-textarea w-full"
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
          <input
            type="text"
            name="company_name"
            value={formData.company_name}
            onChange={handleInputChange}
            className="form-input w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
          <input
            type="text"
            name="product_name"
            value={formData.product_name}
            onChange={handleInputChange}
            className="form-input w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number</label>
          <input
            type="text"
            name="policy_number"
            value={formData.policy_number}
            onChange={handleInputChange}
            className="form-input w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Premium</label>
          <input
            type="number"
            name="premium"
            value={formData.premium}
            onChange={handleInputChange}
            className="form-input w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Coverage Amount</label>
          <input
            type="number"
            name="coverage_amount"
            value={formData.coverage_amount}
            onChange={handleInputChange}
            className="form-input w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Date</label>
          <input
            type="date"
            name="renewal_date"
            value={formData.renewal_date}
            onChange={handleInputChange}
            className="form-input w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            className="form-select w-full"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Lapsed">Lapsed</option>
          </select>
        </div>

        <div className="col-span-1 lg:col-span-3 flex justify-end space-x-3">
          <button type="submit" className="btn btn-primary">
            {customerData ? 'Update Customer' : 'Add Customer'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerForm;
