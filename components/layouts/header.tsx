'use client';
import React, { useEffect, useState } from 'react'; // Added React import
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { IRootState } from '@/store';
import { toggleTheme, toggleSidebar, toggleRTL } from '@/store/themeConfigSlice';
import Dropdown from '@/components/dropdown';
import UserAvatar from './userAvatar'; // Assuming userAvatar.tsx exists
import IconMenu from '@/components/icon/icon-menu';
import IconCalendar from '@/components/icon/icon-calendar';
import IconEdit from '@/components/icon/icon-edit';
import IconChatNotification from '@/components/icon/icon-chat-notification';
import IconSearch from '@/components/icon/icon-search';
import IconXCircle from '@/components/icon/icon-x-circle';
import IconSun from '@/components/icon/icon-sun';
import IconMoon from '@/components/icon/icon-moon';
import IconLaptop from '@/components/icon/icon-laptop';
import IconMailDot from '@/components/icon/icon-mail-dot';
import IconArrowLeft from '@/components/icon/icon-arrow-left';
import IconInfoCircle from '@/components/icon/icon-info-circle';
import IconBellBing from '@/components/icon/icon-bell-bing';
import IconUser from '@/components/icon/icon-user';
import IconMail from '@/components/icon/icon-mail';
import IconLockDots from '@/components/icon/icon-lock-dots';
import IconLogout from '@/components/icon/icon-logout';
import IconMenuDashboard from '@/components/icon/menu/icon-menu-dashboard';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconMenuApps from '@/components/icon/menu/icon-menu-apps';
import IconMenuComponents from '@/components/icon/menu/icon-menu-components';
import IconMenuElements from '@/components/icon/menu/icon-menu-elements';
import IconMenuDatatables from '@/components/icon/menu/icon-menu-datatables';
import IconMenuForms from '@/components/icon/menu/icon-menu-forms';
import IconMenuPages from '@/components/icon/menu/icon-menu-pages';
import IconMenuMore from '@/components/icon/menu/icon-menu-more';
import { usePathname, useRouter } from 'next/navigation';
import { getTranslation } from '@/i18n';
import MobileBottomNav from '@/components/layouts/MobileBottomNav'; // Assuming mobileBottomNav.tsx exists

// --- Firebase Auth Imports ---
import { getAuth, signOut, User, onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';

// --- Component Definition ---
const Header = () => {

    // // --- Internal State for User and Loading ---
    // const [currentUser, setCurrentUser] = useState<User | null>(null);
    // const [authLoading, setAuthLoading] = useState(true);

    const pathname = usePathname();
    const dispatch = useDispatch();
    const router = useRouter();
    const { t, i18n } = getTranslation();

    // --- Listen to Auth State Changes ---
    // useEffect(() => {
    //     const auth = getAuth();
    //     setAuthLoading(true);
    //     const unsubscribe = onAuthStateChanged(auth, (user) => {
    //         console.log("Auth State Changed:", user ? user.uid : 'No User');
    //         setCurrentUser(user);
    //         setAuthLoading(false);
    //     });
    //     // Cleanup subscription on unmount
    //     return () => unsubscribe();
    // }, []);

    const { user, profile, loading } = useAuth() as any;   

    console.log('user:', user);
    console.log('profile:', profile);
    console.log('loading:', loading);

    // --- Handle Sign Out ---
    const handleSignOut = async () => {
        const auth = getAuth();
        try {
            await signOut(auth);
            router.push('/login'); // Adjust redirect path as needed
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };

    // --- Active Menu Logic ---
    useEffect(() => {
        const selector = document.querySelector('ul.horizontal-menu a[href="' + window.location.pathname + '"]');
        if (selector) {
            const allActiveNavLinks: NodeListOf<Element> = document.querySelectorAll('ul.horizontal-menu .nav-link.active');
            allActiveNavLinks.forEach(el => el.classList.remove('active'));
            const allActiveLinks: NodeListOf<Element> = document.querySelectorAll('ul.horizontal-menu a.active');
            allActiveLinks.forEach(el => el.classList.remove('active'));
            selector?.classList.add('active');
            const ul = selector.closest('ul.sub-menu');
            if (ul) {
                let ele = ul.closest('li.menu')?.querySelectorAll('.nav-link');
                if (ele && ele.length > 0) {
                    const firstEle = ele[0];
                    setTimeout(() => { firstEle?.classList.add('active'); });
                }
            }
        }
    }, [pathname]);

    // --- Redux State and Theme Logic ---
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl';
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const setLocale = (flag: string) => {
         if (flag.toLowerCase() === 'ae') { dispatch(toggleRTL('rtl')); }
         else { dispatch(toggleRTL('ltr')); }
         router.refresh();
    };

    // --- Messages/Notifications State & Logic ---
    function createMarkup(htmlContent: string) { return { __html: htmlContent }; }
    const [messages, setMessages] = useState([
        { id: 1, image: '<span class="grid place-content-center w-9 h-9 rounded-full bg-success-light dark:bg-success text-success dark:text-success-light"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></span>', title: 'Congratulations!', message: 'Your OS has been updated.', time: '1hr', },
        { id: 2, image: '<span class="grid place-content-center w-9 h-9 rounded-full bg-info-light dark:bg-info text-info dark:text-info-light"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></span>', title: 'Did you know?', message: 'You can switch between artboards.', time: '2hr', },
        { id: 3, image: '<span class="grid place-content-center w-9 h-9 rounded-full bg-danger-light dark:bg-danger text-danger dark:text-danger-light"> <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>', title: 'Something went wrong!', message: 'Send Reposrt', time: '2days', },
        { id: 4, image: '<span class="grid place-content-center w-9 h-9 rounded-full bg-warning-light dark:bg-warning text-warning dark:text-warning-light"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">    <circle cx="12" cy="12" r="10"></circle>    <line x1="12" y1="8" x2="12" y2="12"></line>    <line x1="12" y1="16" x2="12.01" y2="16"></line></svg></span>', title: 'Warning', message: 'Your password strength is low.', time: '5days', },
    ]);
    const removeMessage = (value: number) => { setMessages(messages.filter((msg) => msg.id !== value)); };
    const [notifications, setNotifications] = useState([
         { id: 1, profile: 'user-profile.jpeg', message: '<strong class="text-sm mr-1">John Doe</strong> invite you to <strong>Prototyping</strong>', time: '45 min ago', },
         { id: 2, profile: 'profile-34.jpeg', message: '<strong class="text-sm mr-1">Adam Nolan</strong> mentioned you to <strong>UX Basics</strong>', time: '9h Ago', },
         { id: 3, profile: 'profile-16.jpeg', message: '<strong class="text-sm mr-1">Anna Morgan</strong> Upload a file', time: '9h Ago', },
    ]);
    const removeNotification = (value: number) => { setNotifications(notifications.filter((notif) => notif.id !== value)); };

    // --- Search State ---
    const [search, setSearch] = useState(false);

    // --- Default Avatar ---
    const defaultAvatar = '/assets/images/user-profile.jpeg'; // Default if no photoURL and no initials generated

    return (
        <>
        <header className={`z-40 hidden md:block ${themeConfig.semidark && themeConfig.menu === 'horizontal' ? 'dark' : ''}`}>
            <div className="shadow-sm">
                <div className="relative flex w-full items-center bg-white px-5 py-2.5 dark:bg-black">
                    {/* Logo and Sidebar Toggle */}
                     <div className="horizontal-logo flex items-center justify-between ltr:mr-2 rtl:ml-2 lg:hidden">
                         <Link href="/" className="main-logo flex shrink-0 items-center"> <img className="inline w-8 ltr:-ml-1 rtl:-mr-1" src="/assets/images/logox.png" alt="logo" /> <span className="hidden align-middle text-2xl font-semibold transition-all duration-300 ltr:ml-1.5 rtl:mr-1.5 dark:text-white-light md:inline">DG Saarthi</span> </Link>
                         <button type="button" className="collapse-icon flex flex-none rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary ltr:ml-2 rtl:mr-2 dark:bg-dark/40 dark:text-[#d0d2d6] dark:hover:bg-dark/60 dark:hover:text-primary lg:hidden" onClick={() => dispatch(toggleSidebar())} > <IconMenu className="h-5 w-5" /> </button>
                     </div>

                    {/* Quick Action Icons */}
                     {/* <div className="hidden ltr:mr-2 rtl:ml-2 sm:block">
                         <ul className="flex items-center space-x-2 rtl:space-x-reverse dark:text-[#d0d2d6]">
                             <li> <Link href="/apps/calendar" className="block rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary dark:bg-dark/40 dark:hover:bg-dark/60"> <IconCalendar /> </Link> </li>
                             <li> <Link href="/apps/todolist" className="block rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary dark:bg-dark/40 dark:hover:bg-dark/60"> <IconEdit /> </Link> </li>
                             <li> <Link href="/apps/chat" className="block rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary dark:bg-dark/40 dark:hover:bg-dark/60"> <IconChatNotification /> </Link> </li>
                         </ul>
                     </div> */}

                    {/* Right Side Header Items */}
                    <div className="flex items-center space-x-1.5 ltr:ml-auto rtl:mr-auto rtl:space-x-reverse dark:text-[#d0d2d6] sm:flex-1 ltr:sm:ml-0 sm:rtl:mr-0 lg:space-x-2">
                        {/* Search Bar */}
                         <div className="sm:ltr:mr-auto sm:rtl:ml-auto">
                             <form className={`${search && '!block'} absolute inset-x-0 top-1/2 z-10 mx-4 hidden -translate-y-1/2 sm:relative sm:top-0 sm:mx-0 sm:block sm:translate-y-0`} onSubmit={() => setSearch(false)} > <div className="relative"> <input type="text" className="peer form-input bg-gray-100 placeholder:tracking-widest ltr:pl-9 ltr:pr-9 rtl:pl-9 rtl:pr-9 sm:bg-transparent ltr:sm:pr-4 rtl:sm:pl-4" placeholder="Search..." /> <button type="button" className="absolute inset-0 h-9 w-9 appearance-none peer-focus:text-primary ltr:right-auto rtl:left-auto"> <IconSearch className="mx-auto" /> </button> <button type="button" className="absolute top-1/2 block -translate-y-1/2 hover:opacity-80 ltr:right-2 rtl:left-2 sm:hidden" onClick={() => setSearch(false)}> <IconXCircle /> </button> </div> </form>
                             <button type="button" onClick={() => setSearch(!search)} className="search_btn rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 dark:bg-dark/40 dark:hover:bg-dark/60 sm:hidden" > <IconSearch className="mx-auto h-4.5 w-4.5 dark:text-[#d0d2d6]" /> </button>
                         </div>

                        {/* Theme Toggle */}
                         <div> {themeConfig.theme === 'light' ? ( <button className={`flex items-center rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary dark:bg-dark/40 dark:hover:bg-dark/60`} onClick={() => dispatch(toggleTheme('dark'))} > <IconSun /> </button> ) : ( '' )} {themeConfig.theme === 'dark' && ( <button className={`flex items-center rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary dark:bg-dark/40 dark:hover:bg-dark/60`} onClick={() => dispatch(toggleTheme('system'))} > <IconMoon /> </button> )} {themeConfig.theme === 'system' && ( <button className={`flex items-center rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary dark:bg-dark/40 dark:hover:bg-dark/60`} onClick={() => dispatch(toggleTheme('light'))} > <IconLaptop /> </button> )} </div>

                        {/* Conditional User Section */}
                          {!loading && user && (  
                            <>
                                {/* Messages Dropdown - RESTORED 
                                <div className="dropdown shrink-0">
                                    <Dropdown offset={[0, 8]} placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`} btnClassName="block p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:text-primary hover:bg-white-light/90 dark:hover:bg-dark/60" button={<IconMailDot />} >
                                        <ul className="w-[300px] !py-0 text-xs text-dark dark:text-white-dark sm:w-[375px]">
                                            <li className="mb-5" onClick={(e) => e.stopPropagation()}> <div className="relative !h-[68px] w-full overflow-hidden rounded-t-md p-5 text-white hover:!bg-transparent"> <div className="bg- absolute inset-0 h-full w-full bg-[url(/assets/images/menu-heade.jpg)] bg-cover bg-center bg-no-repeat"></div> <h4 className="relative z-10 text-lg font-semibold">Messages</h4> </div> </li>
                                            {messages.length > 0 ? (
                                                <> <li onClick={(e) => e.stopPropagation()}> {messages.map((message) => { return ( <div key={message.id} className="flex items-center px-5 py-3"> <div dangerouslySetInnerHTML={createMarkup(message.image)}></div> <span className="px-3 dark:text-gray-500"> <div className="text-sm font-semibold dark:text-white-light/90">{message.title}</div> <div>{message.message}</div> </span> <span className="whitespace-pre rounded bg-white-dark/20 px-1 font-semibold text-dark/60 ltr:ml-auto ltr:mr-2 rtl:ml-2 rtl:mr-auto dark:text-white-dark"> {message.time} </span> <button type="button" className="text-neutral-300 hover:text-danger" onClick={() => removeMessage(message.id)}> <IconXCircle /> </button> </div> ); })} </li>
                                                <li className="mt-5 border-t border-white-light text-center dark:border-white/10"> <button type="button" className="group !h-[48px] justify-center !py-4 font-semibold text-primary dark:text-gray-400"> <span className="group-hover:underline ltr:mr-1 rtl:ml-1">VIEW ALL ACTIVITIES</span> <IconArrowLeft className="transition duration-300 group-hover:translate-x-1 ltr:ml-1 rtl:mr-1" /> </button> </li> </>
                                            ) : (
                                                <li className="mb-5" onClick={(e) => e.stopPropagation()}> <button type="button" className="!grid min-h-[200px] place-content-center text-lg hover:!bg-transparent"> <div className="mx-auto mb-4 rounded-full text-primary ring-4 ring-primary/30"> <IconInfoCircle fill={true} className="h-10 w-10" /> </div> No data available. </button> </li>
                                            )}
                                        </ul>
                                    </Dropdown>
                                </div>*/}

                                {/* Notifications Dropdown - RESTORED 
                                <div className="dropdown shrink-0">
                                    <Dropdown offset={[0, 8]} placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`} btnClassName="relative block p-2 rounded-full bg-white-light/40 dark:bg-dark/40 hover:text-primary hover:bg-white-light/90 dark:hover:bg-dark/60" button={ <span> <IconBellBing /> <span className="absolute top-0 flex h-3 w-3 ltr:right-0 rtl:left-0"> <span className="absolute -top-[3px] inline-flex h-full w-full animate-ping rounded-full bg-success/50 opacity-75 ltr:-left-[3px] rtl:-right-[3px]"></span> <span className="relative inline-flex h-[6px] w-[6px] rounded-full bg-success"></span> </span> </span> } >
                                        <ul className="w-[300px] divide-y !py-0 text-dark dark:divide-white/10 dark:text-white-dark sm:w-[350px]">
                                            <li onClick={(e) => e.stopPropagation()}> <div className="flex items-center justify-between px-4 py-2 font-semibold"> <h4 className="text-lg">Notification</h4> {notifications.length ? <span className="badge bg-primary/80">{notifications.length} New</span> : ''} </div> </li>
                                            {notifications.length > 0 ? (
                                                <> {notifications.map((notification) => { return ( <li key={notification.id} className="dark:text-white-light/90" onClick={(e) => e.stopPropagation()}> <div className="group flex items-center px-4 py-2"> <div className="grid place-content-center rounded"> <div className="relative h-12 w-12"> <img className="h-12 w-12 rounded-full object-cover" alt="profile" src={`/assets/images/${notification.profile}`} /> <span className="absolute bottom-0 right-[6px] block h-2 w-2 rounded-full bg-success"></span> </div> </div> <div className="flex flex-auto ltr:pl-3 rtl:pr-3"> <div className="ltr:pr-3 rtl:pl-3"> <h6 dangerouslySetInnerHTML={{ __html: notification.message, }} ></h6> <span className="block text-xs font-normal dark:text-gray-500">{notification.time}</span> </div> <button type="button" className="text-neutral-300 opacity-0 hover:text-danger group-hover:opacity-100 ltr:ml-auto rtl:mr-auto" onClick={() => removeNotification(notification.id)} > <IconXCircle /> </button> </div> </div> </li> ); })}
                                                <li> <div className="p-4"> <button className="btn btn-primary btn-small block w-full">Read All Notifications</button> </div> </li> </>
                                            ) : (
                                                <li onClick={(e) => e.stopPropagation()}> <button type="button" className="!grid min-h-[200px] place-content-center text-lg hover:!bg-transparent"> <div className="mx-auto mb-4 rounded-full ring-4 ring-primary/30"> <IconInfoCircle fill={true} className="h-10 w-10 text-primary" /> </div> No data available. </button> </li>
                                            )}
                                        </ul>
                                    </Dropdown>
                                </div>*/}

                                {/* Profile Dropdown */}
                                <div className="dropdown flex shrink-0">
                                    <Dropdown offset={[0, 8]} placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`} btnClassName="relative group block" button={ <UserAvatar src={profile?.avatar_url || user.photoURL}  name={profile?.name || user.displayName}  size={36} className="saturate-50 group-hover:saturate-100" /> } >
                                        <ul className="w-[230px] !py-0 font-semibold text-dark dark:text-white-dark dark:text-white-light/90">
                                            <li>
                                                <div className="flex items-center px-4 py-4">
                                                    <UserAvatar src={profile?.avatar_url || user.photoURL}  name={profile?.name || user.displayName} size={40} className="rounded-md" />
                                                    <div className="truncate ltr:pl-4 rtl:pr-4">
                                                        <h4 className="text-base"> {profile?.name ?? user.displayName ?? 'User'}  </h4>
                                                        <button type="button" className="text-black/60 hover:text-primary dark:text-dark-light/60 dark:hover:text-white"> {profile?.email ?? user.email ?? ''} </button>
                                                    </div>
                                                </div>
                                            </li>
                                            <li><Link href="/profile" className="dark:hover:text-white"><IconUser className="h-4.5 w-4.5 shrink-0 ltr:mr-2 rtl:ml-2" /> Profile</Link></li>
                                            {/* <li><Link href="/apps/mailbox" className="dark:hover:text-white"><IconMail className="h-4.5 w-4.5 shrink-0 ltr:mr-2 rtl:ml-2" /> Inbox</Link></li> */}
                                            {/* <li><Link href="/auth/boxed-lockscreen" className="dark:hover:text-white"><IconLockDots className="h-4.5 w-4.5 shrink-0 ltr:mr-2 rtl:ml-2" /> Lock Screen</Link></li> */}
                                            <li className="border-t border-white-light dark:border-white-light/10">
                                                <button type="button" onClick={handleSignOut} className="!py-3 text-danger flex items-center w-full" > <IconLogout className="h-4.5 w-4.5 shrink-0 rotate-90 ltr:mr-2 rtl:ml-2" /> Sign Out </button>
                                            </li>
                                        </ul>
                                    </Dropdown>
                                </div>
                            </>
                        )}

                        {/* Show Sign In Button if Logged Out */}
                        {!loading && !user && ( // Render only when auth check is done and user is null
                             <Link href="/login" className="btn btn-primary"> Sign In </Link>
                        )}

                         {/* Optional: Show a minimal loading state during auth check */}
                         {/* {authLoading && <div className="text-sm px-2">...</div>} */}

                    </div>
                </div>

                {/* horizontal menu */}
                 <ul className="horizontal-menu hidden border-t border-[#ebedf2] bg-white px-6 py-1.5 font-semibold text-black rtl:space-x-reverse dark:border-[#191e3a] dark:bg-black dark:text-white-dark lg:space-x-1.5 xl:space-x-8">
                     {/* Your menu items here - Example: */}
                     <li className="menu nav-item relative">
                         <button type="button" className="nav-link"> <div className="flex items-center"> <IconMenuDashboard className="shrink-0" /> <span className="px-1">{t('dashboard')}</span> </div> <div className="right_arrow"> <IconCaretDown /> </div> </button>
                         <ul className="sub-menu"> <li> <Link href="/">{t('sales')}</Link> </li> {/* ... other sub-menu items ... */} </ul>
                     </li>
                     {/* Add other top-level menu items */}
                 </ul>
            </div>
        </header>
        <MobileBottomNav />
        </>
    );
};

export default Header;