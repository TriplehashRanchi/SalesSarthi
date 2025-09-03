'use client';
import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '@/store';
import { toggleTheme } from '@/store/themeConfigSlice';
import IconSettings from '@/components/icon/icon-settings';
import { ChevronIcon } from '@mantine/core';


const Setting = () => {
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const dispatch = useDispatch();

    // State to manage if the button is fully visible or partially hidden
    const [isExpanded, setIsExpanded] = useState(false);
    
    // useRef to hold the timer ID, so we can clear it if needed
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // This effect handles the auto-retraction after 3 seconds of inactivity
    useEffect(() => {
        // If the button is expanded, start a timer.
        if (isExpanded) {
            timerRef.current = setTimeout(() => {
                setIsExpanded(false);
            }, 3000); // Retract after 3 seconds
        }

        // Cleanup function: If the component unmounts or if isExpanded changes,
        // clear the previously set timer to prevent memory leaks.
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [isExpanded]); // This effect re-runs whenever 'isExpanded' changes

    // This effect handles retracting the button when the user scrolls
    useEffect(() => {
        const handleScroll = () => {
            // If the button is expanded while the user scrolls, retract it.
            if (isExpanded) {
                setIsExpanded(false);
            }
        };

        window.addEventListener('scroll', handleScroll);

        // Cleanup: remove the event listener when the component unmounts
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [isExpanded]); // Dependency ensures we always have the latest 'isExpanded' value

    const handleButtonClick = () => {
        // Whenever the button is clicked, clear any pending auto-retraction timer.
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        if (isExpanded) {
            // If the button is already out, perform the theme toggle action.
            const newTheme = themeConfig.theme === 'light' ? 'dark' : 'light';
            dispatch(toggleTheme(newTheme));
            // Optional: you could make it retract immediately after clicking
            // setIsExpanded(false); 
        } else {
            // If the button is hidden, the first click should just expand it.
            setIsExpanded(true);
        }
    };

    return (
        <button
            type="button"
            onClick={handleButtonClick}
            aria-label="Toggle Theme Settings"
            // Base classes for positioning, styling, and animation
            className={`fixed top-1/2 -translate-y-1/2 right-0 z-[999] flex h-12 w-12 items-center 
                       justify-center rounded-l-full bg-primary text-white shadow-lg 
                       transition-transform duration-300 ease-in-out
                       hover:shadow-xl focus:outline-none`}
            // Conditional class to slide the button in and out
            style={{
                transform: isExpanded ? 'translateX(0)' : 'translateX(32px)', // 32px leaves 16px of the button visible
            }}
        >
            {/* Show a left-arrow "handle" when retracted, and the settings icon when expanded */}
            {isExpanded ? (
                <IconSettings className="h-6 w-6" />
            ) : (
                <ChevronIcon className="h-6 w-6" />
            )}
        </button>
    );
};

export default Setting;