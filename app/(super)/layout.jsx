'use client';

import ContentAnimation from '@/components/layouts/content-animation';
import Footer from '@/components/layouts/footer';
import Header from '@/components/layouts/header';
import MainContainer from '@/components/layouts/main-container';
import Overlay from '@/components/layouts/overlay';
import ScrollToTop from '@/components/layouts/scroll-to-top';
import Setting from '@/components/layouts/setting';
import SuperSide from '@/components/layouts/SuperSide';
import Portals from '@/components/portals';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {jwtDecode} from "jwt-decode";

const SuperAdminLayout = ({ children }) => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("superadmin_token");

        if (!token) {
            router.replace("/super-admin/login");
            return;
        }

        try {
            const decoded = jwtDecode(token);
            const isExpired = decoded.exp * 1000 < Date.now();
            if (isExpired) {
                localStorage.removeItem("superadmin_token");
                router.replace("/super-admin/login");
            } else {
                setAuthenticated(true);
            }
        } catch (err) {
            console.error("Invalid token:", err);
            localStorage.removeItem("superadmin_token");
            router.replace("/super-admin/login");
        } finally {
            setLoading(false);
        }
    }, []);

    if (loading) return <p className="text-center mt-10">Loading Super Admin...</p>;

    if (!authenticated) return null;

    return (
        <div className="relative">
            <Overlay />
            <ScrollToTop />
            <Setting />

            <MainContainer>
                <SuperSide />
                <div className="main-content flex min-h-screen flex-col">
                    <Header />
                    <ContentAnimation>{children}</ContentAnimation>
                    <Footer />
                    <Portals />
                </div>
            </MainContainer>
        </div>
    );
};

export default SuperAdminLayout;
