'use client';
import { useEffect, useState } from 'react';
import { Drawer } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import CustomerAppointments from '@/components/customers/CustomerAppointments';

// A customer's appointments in a side drawer (customer lists). Same screen as on the profile.
// startWithForm: open straight on "Add appointment". onChange: after an appointment is saved or deleted.
// isAdmin: can give appointments to any team member (team members book for themselves).
const AppointmentDrawer = ({ customer, opened, onClose, startWithForm = false, onChange, isAdmin = true }) => {
  const isPhone = useMediaQuery('(max-width: 639px)');
  const [addSignal, setAddSignal] = useState(0);

  useEffect(() => {
    if (opened && startWithForm) setAddSignal((n) => n + 1);
  }, [opened, startWithForm]);

  return (
    <Drawer opened={opened} onClose={onClose} title={`Appointments${customer?.full_name ? ` · ${customer.full_name}` : ''}`} padding="md" size={isPhone ? '100%' : 'xl'} position="right">
      {opened && customer?.id && (
        <div className="-mt-6">
          <CustomerAppointments customer={customer} isAdmin={isAdmin} addSignal={addSignal} onChange={onChange} hideTitle />
        </div>
      )}
    </Drawer>
  );
};

export default AppointmentDrawer;
