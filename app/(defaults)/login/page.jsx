import Login from '@/components/auth/login';
import Link from 'next/link';
import React from 'react';

const BannerPage = () => {
    return (
        <div>
        <div className="absolute inset-0">
            {/* <img src="/assets/images/auth/bg-gradient.png" alt="image" className="h-full w-full object-cover" /> */}
        </div>
        <div className="relative flex min-h-screen items-center justify-center bg-[url(/assets/images/auth/map.png)] bg-cover bg-center bg-no-repeat px-6 py-10 dark:bg-[#060818] sm:px-16">
            {/* <img src="/assets/images/auth/coming-soon-object1.png" alt="image" className="absolute left-0 top-1/2 h-full max-h-[893px] -translate-y-1/2" />
            <img src="/assets/images/auth/coming-soon-object2.png" alt="image" className="absolute left-24 top-0 h-40 md:left-[30%]" />
            <img src="/assets/images/auth/coming-soon-object3.png" alt="image" className="absolute right-0 top-0 h-[300px]" /> */}
            {/* <img src="/assets/images/auth/polygon-object.svg" alt="image" className="absolute bottom-0 end-[28%]" /> */}
            <div className="relative flex w-full max-w-[1502px] flex-col justify-between overflow-hidden rounded-md bg-white/60 backdrop-blur-lg dark:bg-transparent lg:min-h-[758px] lg:flex-row lg:gap-10 xl:gap-0">
                <div className="relative hidden w-full items-center justify-center bg-[linear-gradient(225deg,rgba(20,18,98,1)_0%,rgba(127,97,238,1)_100%)] p-5 lg:inline-flex lg:max-w-[835px] xl:-ms-28 ltr:xl:skew-x-[14deg] rtl:xl:skew-x-[-14deg]">
                    <div className="absolute inset-y-0 w-8 from-primary/10 via-transparent to-transparent ltr:-right-10 ltr:bg-gradient-to-r rtl:-left-10 rtl:bg-gradient-to-l xl:w-16 ltr:xl:-right-20 rtl:xl:-left-20"></div>
                    <div className="ltr:xl:-skew-x-[14deg] rtl:xl:skew-x-[14deg]">
                        <Link href="/" className="ms-10 block w-48 lg:w-72">
                            <img src="/assets/images/logox.png" alt="Logo" className="w-full" />
                        </Link>
                        <div className="mt-24 hidden w-full max-w-[430px] lg:block">
                            {/* <img src="/assets/images/auth/login.svg" alt="Cover Image" className="w-full" /> */}
                            <h2 className='text-3xl text-center font-extrabold  !leading-snug text-pink-100 md:text-4xl font-righteous'>Digital Gyani Saarthi</h2>
                        </div>
                    </div>
                </div>
                <div className="relative flex w-full flex-col items-center justify-center gap-6 px-4 pb-16 pt-6 sm:px-6 lg:max-w-[667px]">
                    <div className="flex w-full max-w-[440px] items-center gap-2 lg:absolute lg:end-6 lg:top-6 lg:max-w-full">
                        <Link href="/" className="block w-8 lg:hidden">
                            <img src="/assets/images/logox.png" alt="Logo" className="mx-auto w-10" />
                        </Link>
                      
                    </div>
                    <div className="w-full max-w-[440px] lg:mt-16">
                        <div className="mb-10">
                            <h1 className="text-3xl font-extrabold uppercase !leading-snug text-primary md:text-4xl">Sign in</h1>
                            <p className="text-base font-bold leading-normal text-white-dark">Enter your email and password to login</p>
                        </div>
                        <Login />

                        <div className="hidden md:block relative my-7 text-center md:mb-9">
                            <span className="absolute inset-x-0 top-1/2 h-px w-full -translate-y-1/2 bg-white-light dark:bg-white-dark"></span>
                            <span className="relative bg-white px-2 font-bold uppercase text-white-dark dark:bg-dark dark:text-white-light">or</span>
                        </div>
                        <div className="hidden md:block text-center dark:text-white">
                            Don&apos;t have an account ?&nbsp;
                            <Link href="/register" className="uppercase text-primary underline transition hover:text-black dark:hover:text-white">
                                SIGN UP
                            </Link>
                        </div>
                    </div>
                    <p className="absolute bottom-6 w-full text-center dark:text-white">© {new Date().getFullYear()} Digital Gyani Saarthi. All Rights Reserved.</p>
                </div>
            </div>
        </div>
    </div>
        
           
          
  
    );
};

export default BannerPage;
