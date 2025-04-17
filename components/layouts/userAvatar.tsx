// src/components/UserAvatar.tsx (or similar path)
import React, { useEffect, useState } from 'react';

interface UserAvatarProps {
    src?: string | null;        // The photoURL
    name?: string | null;       // User's display name
    size?: number;              // Size of the avatar (e.g., 36 for 9x9 in Tailwind)
    className?: string;         // Additional Tailwind classes
    textClassName?: string;    // Classes for the initial text
}

// Helper to get initials
const getInitials = (name?: string | null): string => {
    if (!name) return '?'; // Fallback if no name
    const names = name.trim().split(' ');
    if (names.length === 1) {
        // Single name, take first letter
        return names[0][0]?.toUpperCase() || '?';
    }
    // Multiple names, take first letter of first and last
    const firstInitial = names[0][0]?.toUpperCase() || '';
    const lastInitial = names[names.length - 1][0]?.toUpperCase() || '';
    return `${firstInitial}${lastInitial}` || '?';
};

// Helper to generate a background color based on name (for consistency)
// Simple hash function - you can use more sophisticated ones
const generateBgColor = (name?: string | null): string => {
    if (!name) return 'bg-gray-400'; // Default grey

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash; // Convert to 32bit integer
    }

    // Choose from a predefined list of Tailwind colors
    const colors = [
        'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
        'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
        'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
        'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
        'bg-rose-500',
    ];
    const index = Math.abs(hash % colors.length);
    return colors[index];
};


const UserAvatar: React.FC<UserAvatarProps> = ({
    src,
    name,
    size = 36, // Corresponds to h-9 w-9
    className = '',
    textClassName = 'font-semibold text-white'
}) => {
    const [imgError, setImgError] = useState(false);

    const handleError = () => {
        setImgError(true);
    };

    // Reset error state if src changes
    useEffect(() => {
        setImgError(false);
    }, [src]);

    const initials = getInitials(name);
    const bgColor = generateBgColor(name);
    const sizeClasses = `h-${size / 4} w-${size / 4}`; // Basic mapping to Tailwind h/w utilities

    // Render image if src exists and hasn't errored
    if (src && !imgError) {
        return (
            <img
                className={`rounded-full object-cover ${sizeClasses} ${className}`}
                src={src}
                alt={name || 'User Avatar'}
                onError={handleError}
                width={size}
                height={size}
            />
        );
    }

    // Render initials if no src or if image failed to load
    return (
        <div
            className={`rounded-full flex items-center justify-center ${sizeClasses} ${bgColor} ${className}`}
            style={{ width: `${size}px`, height: `${size}px` }} // Inline styles for precise size
        >
            <span className={`text-${Math.max(10, Math.floor(size / 2.5))}px ${textClassName}`}> {/* Basic dynamic text size */}
                 {initials}
            </span>
        </div>
    );
};

export default UserAvatar;