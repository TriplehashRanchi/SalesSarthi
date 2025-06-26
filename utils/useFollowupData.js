// file: src/hooks/useFollowupData.js
import { useMemo } from 'react';

export const useFollowupData = (events) => {
    return useMemo(() => {
        if (!events || events.length === 0) {
            return {
                stats: { total: 0, pending: 0, completed: 0, dueToday: 0 },
                upcoming: [],
            };
        }

        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        const todayEnd = new Date(now.setHours(23, 59, 59, 999));

        let pending = 0;
        let completed = 0;
        let dueToday = 0;
        const upcoming = [];

        events.forEach(event => {
            const eventStart = new Date(event.start);
            const status = event.extendedProps.status;

            if (status === 'Completed') {
                completed++;
            } else { // 'Pending' or other statuses
                pending++;
                if (eventStart >= new Date()) {
                    upcoming.push(event);
                }
            }

            if (eventStart >= todayStart && eventStart <= todayEnd) {
                dueToday++;
            }
        });

        // Sort upcoming events by date
        upcoming.sort((a, b) => new Date(a.start) - new Date(b.start));

        return {
            stats: { total: events.length, pending, completed, dueToday },
            upcoming: upcoming.slice(0, 5), // Get the next 5
        };
    }, [events]);
};