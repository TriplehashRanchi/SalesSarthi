import ProviderComponent from '@/components/layouts/provider-component';
import 'react-perfect-scrollbar/dist/css/styles.css';
import '../styles/tailwind.css';
import { Metadata } from 'next';
import { Nunito, Righteous } from 'next/font/google';
import Head from 'next/head';
import SafeArea from '@/components/SafeArea';

export const metadata: Metadata = {
    title: {
        template: '%s | DG Saarthi - har kadam aapke sath',
        default: 'DG Saarthi - har kadam aapke sath',
    },
};
const nunito = Nunito({
    weight: ['400', '500', '600', '700', '800'],
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-nunito',
});

const righteous = Righteous({
    weight: ['400'],
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-righteous',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
        <head>
            <meta
            name="viewport"
            content="viewport-fit=cover, width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no"
            />
        </head>
            <body
                className={`${nunito.variable} ${righteous.variable} mt-10 md:mt-0`}
            >
                  {/* <div className="main-app-container"> */}
                <ProviderComponent>{children}</ProviderComponent>
                {/* </div> */}
            </body>
        </html>
    );
}
