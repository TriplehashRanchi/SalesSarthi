//app/(users)/layout.jsx
"use client";
import ContentAnimation from '@/components/layouts/content-animation';
import Footer from '@/components/layouts/footer';
import Header from '@/components/layouts/userheader';
import MainContainer from '@/components/layouts/main-container';
import Overlay from '@/components/layouts/overlay';
import ScrollToTop from '@/components/layouts/scroll-to-top';
import Setting from '@/components/layouts/setting';
import Sidebar from '@/components/layouts/sidebar';
import Portals from '@/components/portals';
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import UserSide from '@/components/layouts/UserSide';

const DefaultLayout = ({ children }) => {
    const { user, loading } = useAuth();
    const router = useRouter();


 useEffect(() => {
    if (loading) return;

    if (!user) {
        router.push("/register"); // Not logged in
    } else if (user.role !== "Salesperson" && user.role !== "Manager") {
        router.push("/"); // Not a valid team role
    } else {
        if (user.status === "pending") {
            router.push("/payment"); // Pending subscription
        } else if (user.status === "expired") {
            router.push("/subscription-expired"); // Expired
        }
    }
}, [user, loading, router]);


    if (loading || !user) return <p className="text-center mt-10">Loading...</p>; // Show loading state

    return (
        <>
            {/* BEGIN MAIN CONTAINER */}
            <div className="relative">
                <Overlay />
                <ScrollToTop />

                {/* BEGIN APP SETTING LAUNCHER */}
                <Setting />
                {/* END APP SETTING LAUNCHER */}

                <MainContainer>
                    {/* BEGIN SIDEBAR */}
                    <UserSide />        
                    {/* END SIDEBAR */}
                    <div className="main-content flex min-h-screen flex-col">
                        {/* BEGIN TOP NAVBAR */}
                        <Header user={user} />
                        {/* END TOP NAVBAR */}

                        {/* BEGIN CONTENT AREA */}
                        <ContentAnimation>{children}</ContentAnimation>
                        {/* END CONTENT AREA */}

                        {/* BEGIN FOOTER */}
                        <Footer />
                        {/* END FOOTER */}
                        <Portals />
                    </div>
                </MainContainer>
            </div>
        </>
    );
};

export default DefaultLayout;
