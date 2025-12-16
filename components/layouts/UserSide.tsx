'use client';
import PerfectScrollbar from 'react-perfect-scrollbar';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { toggleSidebar } from '@/store/themeConfigSlice';
import AnimateHeight from 'react-animate-height';
import { IRootState } from '@/store';
import { useState, useEffect } from 'react';
import IconCaretsDown from '@/components/icon/icon-carets-down';
import IconMenuDashboard from '@/components/icon/menu/icon-menu-dashboard';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconMinus from '@/components/icon/icon-minus';
import IconMenuChat from '@/components/icon/menu/icon-menu-chat';
import IconMenuMailbox from '@/components/icon/menu/icon-menu-mailbox';
import IconMenuTodo from '@/components/icon/menu/icon-menu-todo';
import IconMenuNotes from '@/components/icon/menu/icon-menu-notes';
import IconMenuScrumboard from '@/components/icon/menu/icon-menu-scrumboard';
import IconMenuContacts from '@/components/icon/menu/icon-menu-contacts';
import IconMenuInvoice from '@/components/icon/menu/icon-menu-invoice';
import IconMenuCalendar from '@/components/icon/menu/icon-menu-calendar';
import IconMenuComponents from '@/components/icon/menu/icon-menu-components';
import IconMenuElements from '@/components/icon/menu/icon-menu-elements';
import IconMenuCharts from '@/components/icon/menu/icon-menu-charts';
import IconMenuWidgets from '@/components/icon/menu/icon-menu-widgets';
import IconMenuFontIcons from '@/components/icon/menu/icon-menu-font-icons';
import IconMenuDragAndDrop from '@/components/icon/menu/icon-menu-drag-and-drop';
import IconMenuTables from '@/components/icon/menu/icon-menu-tables';
import IconMenuDatatables from '@/components/icon/menu/icon-menu-datatables';
import IconMenuForms from '@/components/icon/menu/icon-menu-forms';
import IconMenuUsers from '@/components/icon/menu/icon-menu-users';
import IconMenuPages from '@/components/icon/menu/icon-menu-pages';
import IconMenuAuthentication from '@/components/icon/menu/icon-menu-authentication';
import IconMenuDocumentation from '@/components/icon/menu/icon-menu-documentation';
import { usePathname, useRouter } from 'next/navigation';
import { getTranslation } from '@/i18n';
import IconLaptop from '../icon/icon-laptop';
import IconNotes from '../icon/icon-notes';
import IconUserPlus from '../icon/icon-user-plus';
import IconUsersGroup from '../icon/icon-users-group';
import { IconAccessPoint, IconAccessPointOff, IconHistory } from '@tabler/icons-react';
import { getAuth, signOut } from 'firebase/auth';
import IconLogout from '../icon/icon-logout';
import { useAuth } from '@/context/AuthContext';

import axios from 'axios';

interface Banner {
    created_at: string;
    // add any additional fields if needed
}

const UserSide = () => {

    const dispatch = useDispatch();
    const { t } = getTranslation();
    const pathname = usePathname();
    const [currentMenu, setCurrentMenu] = useState<string>('');
    const [errorSubMenu, setErrorSubMenu] = useState(false);
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const semidark = useSelector((state: IRootState) => state.themeConfig.semidark);
    const [todayBannerCount, setTodayBannerCount] = useState(0);
    //  const { user } = useAuth();
    // const role = user?.role;
    // console.log("user", role)
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    useEffect(() => {
        const fetchTodayCount = async () => {
            try {
                const { data } = await axios.get<Banner[]>(`${API_URL}/api/banners`);
                const today = new Date().toISOString().split('T')[0];

                const todays = data.filter((b: Banner) => {
                    const created = new Date(b.created_at).toISOString().split('T')[0];
                    return created === today;
                });

                setTodayBannerCount(todays.length);
            } catch (error) {
                console.log('Banner count fetch error:', error);
            }
        };

        fetchTodayCount();
    }, []);

    const toggleMenu = (value: string) => {
        setCurrentMenu((oldValue) => {
            return oldValue === value ? '' : value;
        });
    };

    const router = useRouter();

    // --- Handle Sign Out ---
    const handleSignOut = async () => {
        const auth = getAuth();
        try {
            await signOut(auth);
            router.push('/login'); // Adjust redirect path as needed
        } catch (error) {
            console.error('Error signing out: ', error);
        }
    };

    useEffect(() => {
        const selector = document.querySelector('.sidebar ul a[href="' + window.location.pathname + '"]');
        if (selector) {
            selector.classList.add('active');
            const ul: any = selector.closest('ul.sub-menu');
            if (ul) {
                let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link') || [];
                if (ele.length) {
                    ele = ele[0];
                    setTimeout(() => {
                        ele.click();
                    });
                }
            }
        }
    }, []);

    useEffect(() => {
        setActiveRoute();
        if (window.innerWidth < 1024 && themeConfig.sidebar) {
            dispatch(toggleSidebar());
        }
    }, [pathname]);

    const setActiveRoute = () => {
        let allLinks = document.querySelectorAll('.sidebar ul a.active');
        for (let i = 0; i < allLinks.length; i++) {
            const element = allLinks[i];
            element?.classList.remove('active');
        }
        const selector = document.querySelector('.sidebar ul a[href="' + window.location.pathname + '"]');
        selector?.classList.add('active');
    };

    return (
        <div className={semidark ? 'dark' : ''}>
            <nav
                className={`sidebar fixed bottom-0 top-0 z-50 h-full min-h-screen w-[260px] shadow-[5px_0_25px_0_rgba(94,92,154,0.1)] transition-all duration-300 ${semidark ? 'text-white-dark' : ''}`}
            >
                <div className="h-full bg-white dark:bg-black">
                    <div className="flex items-center justify-between px-4 py-3">
                        <Link href="/" className="main-logo flex shrink-0 items-center">
                            <img className="ml-[5px] w-8 flex-none" src="/assets/images/logox.png" alt="logo" />
                            <span className="align-middle text-2xl font-semibold ltr:ml-1.5 rtl:mr-1.5 dark:text-white-light lg:inline">DG Saarthi</span>
                        </Link>

                        <button
                            type="button"
                            className="collapse-icon flex h-8 w-8 items-center rounded-full transition duration-300 hover:bg-gray-500/10 rtl:rotate-180 dark:text-white-light dark:hover:bg-dark-light/10"
                            onClick={() => dispatch(toggleSidebar())}
                        >
                            <IconCaretsDown className="m-auto rotate-90" />
                        </button>
                    </div>
                    <PerfectScrollbar className="relative h-[calc(100vh-80px)]">
                        <ul className="relative space-y-0.5 p-4 py-0 font-semibold">
                            <li className="menu nav-item">
                                <Link href="/user-dashboard">
                                    <div className="flex items-center">
                                        <IconMenuDashboard className="shrink-0 group-hover:!text-primary" />
                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('dashboard')}</span>
                                    </div>
                                </Link>
                            </li>
                            <li className="menu nav-item">
                                <Link href="/useraddlead">
                                    <div className="flex items-center">
                                        <IconUserPlus className="shrink-0 group-hover:!text-primary" />
                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('Add New Lead')}</span>
                                    </div>
                                </Link>
                            </li>
                            <li className="menu nav-item">
                                <Link href="/userleadtable">
                                    <div className="flex items-center">
                                        <IconUsersGroup className="shrink-0 group-hover:!text-primary" />
                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('My Assigned Leads')}</span>
                                    </div>
                                </Link>
                            </li>
                            <li className="menu nav-item">
                                <Link href="/user-followup">
                                    <div className="flex items-center">
                                        <IconHistory className="shrink-0 group-hover:!text-primary" />
                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('My Follow Ups')}</span>
                                    </div>
                                </Link>
                            </li>
                            <li className="menu nav-item">
                                <Link href="/fin-health">
                                    <div className="flex items-center">
                                        <IconMenuCharts className="shrink-0 group-hover:!text-primary" />
                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('Fin Health Calculator')}</span>
                                    </div>
                                </Link>
                            </li>
                            <li className="menu nav-item">
                                <Link href="/usercustomers">
                                    <div className="flex items-center">
                                        <IconNotes className="shrink-0 group-hover:!text-primary" />
                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('Customers')}</span>
                                    </div>
                                </Link>
                            </li>
                            <li className="menu nav-item">
                                <Link href="/userappointments">
                                    <div className="flex items-center">
                                        <IconNotes className="shrink-0 group-hover:!text-primary" />
                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('My Appointments')}</span>
                                    </div>
                                </Link>
                            </li>
                            <li className="menu nav-item">
                                <Link href="/ad-banner">
                                    <div className="flex items-center relative">
                                        <IconLaptop className="shrink-0 group-hover:!text-primary" />

                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('Banner Maker')}</span>

                                        {/* ---- Today Banner Count Badge ---- */}
                                        {todayBannerCount > 0 && (
                                            <span
                                                className="
                        absolute
                        right-[-25px]
                        top-1/2
                        -translate-y-1/2
                        bg-blue-600
                        text-white
                        text-[10px]
                        px-2 py-[1px]
                        rounded-full
                        shadow-md
                        
                    "
                                            >
                                                {todayBannerCount}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            </li>

                            <li className="block md:hidden menu nav-item">
                                <a onClick={handleSignOut}>
                                    <div className="flex items-center">
                                        <IconLogout className="shrink-0 group-hover:!text-primary" />
                                        <span className="text-red-300 ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('Log Out')}</span>
                                    </div>
                                </a>
                            </li>

                            {/* {role === 'agent' && (
                                <li className="menu nav-item">
                                    <Link href="/logs">
                                        <div className="flex items-center">
                                            <IconAccessPoint className="shrink-0 group-hover:!text-primary" />
                                            <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('My Activity')}</span>
                                        </div>
                                    </Link>
                                </li>
                            )} */}
                        </ul>
                    </PerfectScrollbar>
                </div>
            </nav>
        </div>
    );
};

export default UserSide;
