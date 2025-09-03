'use client';
import clsx from 'clsx';

type Edge = 'top'|'bottom'|'left'|'right';
export default function SafeArea({
  edges = ['top','bottom'],
  as: As = 'div',
  className,
  children,
  fallback = { top: 8, bottom: 12, left: 0, right: 0 }
}: {
  edges?: Edge[];
  as?: any;
  className?: string;
  children?: React.ReactNode;
  fallback?: { top:number; bottom:number; left:number; right:number };
}) {
  const style: React.CSSProperties = {
    paddingTop:    edges.includes('top')    ? `var(--safe-area-inset-top, 0px)`       : undefined,
    paddingBottom: edges.includes('bottom') ? `var(--safe-area-inset-bottom, 0px)` : undefined,
    paddingLeft:   edges.includes('left')   ? `max(env(safe-area-inset-left,0px), ${fallback.left}px)`     : undefined,
    paddingRight:  edges.includes('right')  ? `max(env(safe-area-inset-right,0px), ${fallback.right}px)`   : undefined,
  };
  return <As style={style} className={clsx(className)}>{children}</As>;
}
