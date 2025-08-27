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
            <Head>
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
            </Head>
            <body
                className={`${nunito.variable} ${righteous.variable} mt-10 md:mt-0`}
            >
                  <SafeArea edges={['top','bottom']} className="min-h-screen flex flex-col">
                <ProviderComponent>{children}</ProviderComponent>
                </SafeArea>
            </body>
        </html>
    );
}
