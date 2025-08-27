/*
 * components/layouts/MobileBottomNav.jsx
 * A mobile-only bottom navigation bar using existing icons and toggle
 */
'use client';
import { useRouter } from 'next/navigation';
import IconMenuDashboard from '@/components/icon/menu/icon-menu-dashboard';
import IconMenu from '@/components/icon/icon-menu';
import IconUser from '@/components/icon/icon-user';
import { useDispatch } from 'react-redux';
import { toggleSidebar } from '@/store/themeConfigSlice';
import IconUsers from '../icon/icon-users';
import { IconHistory } from '@tabler/icons-react';

export default function MobileBottomNav() {
  const router = useRouter();
  const dispatch = useDispatch();

  const navItems = [
    { icon: <IconMenu className="w-6 h-6" />, label: 'Menu', action: () => dispatch(toggleSidebar()) },
    { icon: <IconMenuDashboard className="w-6 h-6" />, label: 'Home', path: '/dashboard' },
    { icon: <IconHistory className="w-6 h-6" />, label: 'History', path: '/followups' },
    { icon: <IconUser className="w-6 h-6" />, label: 'Profile', path: '/profile' },
    { icon: <IconUsers className="w-6 h-6" />, label: 'Leads', path: '/leadtable' },
   
  ];

  return (
    <nav className="fixed bottom-20 left-0 right-0 z-50 flex justify-around items-center border-t bg-white dark:bg-black py-2 shadow-inner md:hidden">
      {navItems.map((item) => (
        <button
          key={item.label}
          onClick={() => {
            if (item.path) router.push(item.path);
            if (item.action) item.action();
          }}
          className="flex flex-col items-center text-gray-700 dark:text-gray-300"
        >
          {item.icon}
          <span className="text-xs mt-1">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}


