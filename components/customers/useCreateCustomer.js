'use client';
import { useState } from 'react';
import axios from 'axios';
import { showNotification } from '@mantine/notifications';
import { authHeaders } from '@/utils/authHeaders';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Plain message for the user from an API error.
export const errorMessage = (err, fallback) => {
  const data = err?.response?.data;
  if (data && typeof data === 'object' && data.message) return data.message;
  if (!err?.response) return 'Could not reach the server. Please check your internet connection and try again.';
  return fallback;
};

// Saves a new customer with the duplicate check. endpoint: '/api/customers' (admin) or '/api/customers/user'.
// submit(body) → true when saved, false when a duplicate needs review or it failed (form keeps its data).
// While `duplicate` is set, render <DuplicateCustomerModal duplicate={duplicate} {...modalProps} />.
export default function useCreateCustomer({ endpoint, onSaved }) {
  const [duplicate, setDuplicate] = useState(null);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  const post = async (body) => {
    const res = await axios.post(`${API_URL}${endpoint}`, body, { headers: await authHeaders() });
    return res.data;
  };

  const finish = (data) => {
    showNotification(
      data?.added_to_existing
        ? { title: 'Added to existing customer', message: 'The product was added to the customer\'s profile. Their saved details were not changed.', color: 'blue' }
        : data?.needs_review
          ? { title: 'Saved separately', message: 'This customer is now listed in Duplicate Customers. Compare the records there and merge them if they are the same person.', color: 'orange', autoClose: 8000 }
          : { title: 'Success', message: 'Customer created successfully', color: 'green' },
    );
    onSaved?.(data);
  };

  const submit = async (body) => {
    try {
      const data = await post(body);
      finish(data);
      return true;
    } catch (err) {
      if (err?.response?.status === 409 && err.response.data?.code === 'DUPLICATE_CUSTOMER') {
        setPending(body);
        setDuplicate(err.response.data);
        return false;
      }
      showNotification({ title: 'Could not save', message: errorMessage(err, 'Could not save the customer. Please try again.'), color: 'red' });
      return false;
    }
  };

  const resolve = async (extra) => {
    setBusy(true);
    try {
      const data = await post({ ...pending, ...extra });
      setDuplicate(null);
      setPending(null);
      finish(data);
    } catch (err) {
      showNotification({ title: 'Could not save', message: errorMessage(err, 'Could not save the customer. Please try again.'), color: 'red' });
    } finally {
      setBusy(false);
    }
  };

  return {
    submit,
    duplicate,
    modalProps: {
      busy,
      onClose: () => {
        setDuplicate(null);
        setPending(null);
      },
      onAddToExisting: (id) => resolve({ duplicate_action: 'add_to_existing', existing_customer_id: id }),
      onCreateNew: () => resolve({ duplicate_action: 'create_new' }),
    },
  };
}
