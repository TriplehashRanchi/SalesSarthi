'use client';
import { IRootState } from '@/store';
import { toggleSidebar } from '@/store/themeConfigSlice';
import { useDispatch, useSelector } from 'react-redux';
import { usePathname } from 'next/navigation';

const Overlay = () => {
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const dispatch = useDispatch();
    const pathname = usePathname();
    return (
        <>
            {/* sidebar menu overlay */}
            <div className={`${(!themeConfig.sidebar && 'hidden') || ''} ${pathname === '/dashboard' ? 'hidden' : ''} fixed inset-0 z-50 bg-[black]/60 lg:hidden`} onClick={() => dispatch(toggleSidebar())}></div>
        </>
    );
};

export default Overlay;
