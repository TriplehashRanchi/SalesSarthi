'use client';
import { PropsWithChildren, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '@/store';
import { toggleRTL, toggleTheme, toggleMenu, toggleLayout, toggleAnimation, toggleNavbar, toggleSemidark } from '@/store/themeConfigSlice';
import Loading from '@/components/layouts/loading';
import { getTranslation } from '@/i18n';
import { AuthProvider } from '@/context/AuthContext';
import { NotificationsProvider } from '@mantine/notifications';
import { MantineProvider } from '@mantine/core';
import { SafeArea } from 'capacitor-plugin-safe-area';
import { log } from 'util';

function App({ children }: PropsWithChildren) {
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const dispatch = useDispatch();
    const { initLocale } = getTranslation();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        dispatch(toggleTheme(localStorage.getItem('theme') || themeConfig.theme));
        dispatch(toggleMenu(localStorage.getItem('menu') || themeConfig.menu));
        dispatch(toggleLayout(localStorage.getItem('layout') || themeConfig.layout));
        dispatch(toggleRTL(localStorage.getItem('rtlClass') || themeConfig.rtlClass));
        dispatch(toggleAnimation(localStorage.getItem('animation') || themeConfig.animation));
        dispatch(toggleNavbar(localStorage.getItem('navbar') || themeConfig.navbar));
        dispatch(toggleSemidark(localStorage.getItem('semidark') || themeConfig.semidark));

        // locale
        initLocale(themeConfig.locale);

        setIsLoading(false);
    }, [dispatch, initLocale, themeConfig.theme, themeConfig.menu, themeConfig.layout, themeConfig.rtlClass, themeConfig.animation, themeConfig.navbar, themeConfig.locale, themeConfig.semidark]);

    useEffect(() => {
    (async () => {
      // Get safe area insets
      const { insets } = await SafeArea.getSafeAreaInsets();
      // Apply insets as CSS custom properties
      for (const [key, value] of Object.entries(insets)) {
        document.documentElement.style.setProperty(
          `--safe-area-inset-${key}`,
          `${value}px`
        );
      }
      console.log('Safe area insets applied:', insets);
    })();
  }, []);

    return (
        <NotificationsProvider>
            <MantineProvider
  theme={{ colorScheme: themeConfig.theme === 'dark' ? 'dark' : 'light' }}
>

        <AuthProvider>
            <div
                className={`${(themeConfig.sidebar && 'toggle-sidebar') || ''} ${themeConfig.menu} ${themeConfig.layout} ${
                    themeConfig.rtlClass
                } main-section safe-area relative font-nunito text-sm font-normal antialiased`}
            >
                {isLoading ? <Loading /> : children}
            </div>
        </AuthProvider>
        </MantineProvider>
        </NotificationsProvider>
    );
}

export default App;
