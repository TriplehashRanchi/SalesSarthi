'use client';
// Toolbar button that keeps the desktop toolbar on ONE line: full button with its label on wide screens (xl+),
// a compact icon button (name shown on hover) on smaller laptops / tablets.
import { ActionIcon, Button, Tooltip } from '@mantine/core';

export default function ToolbarButton({ icon, label, onClick, variant = 'light', color = 'blue', showFrom = 'xl' }) {
  const full = showFrom === 'lg' ? 'hidden lg:inline-flex' : 'hidden xl:inline-flex';
  const compact = showFrom === 'lg' ? 'lg:!hidden' : 'xl:!hidden';
  // Show/hide on wrapper spans: Mantine's own styles set `display` on the buttons and could beat Tailwind's `hidden`.
  return (
    <>
      <span className={`${full} shrink-0`}>
        <Button variant={variant} color={color} leftIcon={icon} onClick={onClick}>
          {label}
        </Button>
      </span>
      <span className={`${compact} inline-flex shrink-0`}>
        <Tooltip label={label} withinPortal>
          <ActionIcon variant={variant} color={color} size={36} radius="sm" onClick={onClick} aria-label={label}>
            {icon}
          </ActionIcon>
        </Tooltip>
      </span>
    </>
  );
}
