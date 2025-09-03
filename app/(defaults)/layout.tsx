'use client';
import ContentAnimation from '@/components/layouts/content-animation';
import Footer from '@/components/layouts/footer';
import Header from '@/components/layouts/header';
import MainContainer from '@/components/layouts/main-container';
import Overlay from '@/components/layouts/overlay';
import ScrollToTop from '@/components/layouts/scroll-to-top';
import Setting from '@/components/layouts/setting';
import Sidebar from '@/components/layouts/sidebar';
import Portals from '@/components/portals';
import { AuthProvider } from '@/context/AuthContext';
import Head from 'next/head';

export default function DefaultLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
        <Head>
  <link href="https://fonts.googleapis.com/css2?family=Righteous&display=swap" rel="stylesheet" />
   <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
</Head>
        <AuthProvider>
         <div className="min-h-screen text-black dark:text-white-dark">{children} </div>
         </AuthProvider>
         </>
    );
}
