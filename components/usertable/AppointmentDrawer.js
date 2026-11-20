'use client';
import AppointmentDrawer from '@/components/Leadtable/AppointmentDrawer';

// Team member's version: appointments are booked for themselves.
const UserAppointmentDrawer = (props) => <AppointmentDrawer {...props} isAdmin={false} />;

export default UserAppointmentDrawer;
