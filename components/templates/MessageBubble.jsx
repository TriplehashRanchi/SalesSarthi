'use client';

import { Box } from '@mantine/core';

// Sample values so a template can be previewed the way a customer would read it.
export const SAMPLE_VALUES = {
    '{name}': 'Rahul',
    '{policy_number}': 'POL123456',
    '{dob}': '15 Aug 1990',
    '{renewal_date}': '12 Dec 2026',
    '{appointment_date}': '5 Nov 2026',
};

// Chat-style bubble. `filled` swaps {variables} for sample values; otherwise they show as small chips.
const MessageBubble = ({ message, filled = false, clamp }) => {
    const parts = String(message || '').split(/(\{[a-z_]+\})/g);

    return (
        <Box
            sx={(theme) => ({
                background: theme.colorScheme === 'dark' ? theme.colors.dark[6] : '#e8f6ee',
                border: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[4] : '#cfe9db'}`,
                borderRadius: '4px 14px 14px 14px',
                padding: '10px 14px',
                fontSize: theme.fontSizes.sm,
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                ...(clamp ? { display: '-webkit-box', WebkitLineClamp: clamp, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}),
            })}
        >
            {parts.map((part, i) => {
                if (!/^\{[a-z_]+\}$/.test(part)) return <span key={i}>{part}</span>;
                if (filled) return <strong key={i}>{SAMPLE_VALUES[part] || part}</strong>;
                return (
                    <Box
                        key={i}
                        component="span"
                        sx={(theme) => ({
                            background: theme.colorScheme === 'dark' ? theme.colors.dark[4] : '#fff',
                            border: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[3] : '#b9dcc8'}`,
                            borderRadius: 6,
                            padding: '0 6px',
                            fontSize: 12,
                            fontWeight: 600,
                            color: theme.colorScheme === 'dark' ? theme.colors.green[4] : theme.colors.green[8],
                        })}
                    >
                        {part.slice(1, -1).replace(/_/g, ' ')}
                    </Box>
                );
            })}
        </Box>
    );
};

export default MessageBubble;
