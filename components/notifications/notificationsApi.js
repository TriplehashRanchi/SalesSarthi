// API helpers for /api/notifications (the signed-in person's own notifications, settings and push devices).
import axios from 'axios';
import { getAuth } from 'firebase/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const headers = async () => {
    const user = getAuth().currentUser;
    if (!user) throw new Error('User not authenticated.');
    return { Authorization: `Bearer ${await user.getIdToken()}` };
};
const url = (p = '') => `${API_URL}/api/notifications${p}`;

export const listNotifications = async (params) => (await axios.get(url(), { headers: await headers(), params })).data;
export const unreadCount = async () => (await axios.get(url('/unread-count'), { headers: await headers() })).data.unread;
export const markRead = async (ids) => (await axios.post(url('/read'), ids === 'all' ? { all: true } : { ids }, { headers: await headers() })).data;
export const markUnread = async (ids) => (await axios.post(url('/unread'), { ids }, { headers: await headers() })).data;
export const dismissNotifications = async (ids) => (await axios.post(url('/dismiss'), { ids }, { headers: await headers() })).data;
export const getSettings = async () => (await axios.get(url('/settings'), { headers: await headers() })).data;
export const saveSettings = async (changes) => (await axios.put(url('/settings'), changes, { headers: await headers() })).data.settings;
export const listDevices = async () => (await axios.get(url('/devices'), { headers: await headers() })).data;
export const registerDevice = async (token, platform, label) => (await axios.post(url('/devices'), { token, platform, label }, { headers: await headers() })).data;
export const unregisterDevice = async (token) => (await axios.delete(url('/devices'), { headers: await headers(), data: { token } })).data;
export const sendTest = async () => (await axios.post(url('/test'), {}, { headers: await headers() })).data;

// Tell other parts of the page (bell, notifications page) that something changed.
export const NOTIFICATIONS_CHANGED = 'crm-notifications-changed';
export const announceChange = () => typeof window !== 'undefined' && window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
