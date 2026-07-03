/**
 * Shared motion animation presets for Framer Motion.
 * Import these variants/transitions across components for consistent motion design.
 */

import { type Variants, type Transition } from 'framer-motion';

// ─── Easing Curves ──────────────────────────────────────────────────────────
export const easings = {
  // Apple-style spring
  spring: { type: 'spring', stiffness: 300, damping: 30 } as Transition,
  // Smooth overshoot
  overshoot: { type: 'spring', stiffness: 400, damping: 25 } as Transition,
  // Snappy
  snappy: { type: 'spring', stiffness: 500, damping: 35 } as Transition,
  // Buttery smooth
  smooth: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } as Transition,
  // Dramatic entrance
  dramatic: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } as Transition,
  // Subtle
  subtle: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } as Transition,
};

// ─── Page Transitions ───────────────────────────────────────────────────────
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    filter: 'blur(4px)',
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.08,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    filter: 'blur(2px)',
    transition: { duration: 0.3, ease: [0.4, 0, 1, 1] },
  },
};

// ─── Stagger Container ──────────────────────────────────────────────────────
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerSlow: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

// ─── Fade + Slide Variants ──────────────────────────────────────────────────
export const fadeSlideUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

export const fadeSlideDown: Variants = {
  initial: { opacity: 0, y: -15 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

export const fadeSlideRight: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

export const fadeSlideLeft: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

// ─── Scale Variants ─────────────────────────────────────────────────────────
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },
};

export const scaleInBounce: Variants = {
  initial: { opacity: 0, scale: 0.85 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 20 },
  },
};

// ─── Card Hover ─────────────────────────────────────────────────────────────
export const cardHover: Variants = {
  initial: { y: 0, boxShadow: '0 1px 3px 0 rgba(0,0,0,0.4)' },
  hover: {
    y: -4,
    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5), 0 0 20px -5px rgba(99,102,241,0.15)',
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },
  tap: {
    y: -1,
    scale: 0.995,
    transition: { duration: 0.1 },
  },
};

// ─── Modal / Overlay ────────────────────────────────────────────────────────
export const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

export const modalVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.92,
    y: 30,
    filter: 'blur(4px)',
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      stiffness: 350,
      damping: 30,
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 15,
    filter: 'blur(2px)',
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
  },
};

// ─── List item ──────────────────────────────────────────────────────────────
export const listItem: Variants = {
  initial: { opacity: 0, x: -12, filter: 'blur(2px)' },
  animate: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    x: 12,
    filter: 'blur(2px)',
    transition: { duration: 0.2 },
  },
};

// ─── Stat counter pop ───────────────────────────────────────────────────────
export const statPop: Variants = {
  initial: { opacity: 0, scale: 0.5, y: 10 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 20,
    },
  },
};

// ─── Shimmer text ───────────────────────────────────────────────────────────
export const shimmerText: Variants = {
  initial: { backgroundPosition: '-200% 0' },
  animate: {
    backgroundPosition: '200% 0',
    transition: { duration: 2.5, ease: 'linear', repeat: Infinity },
  },
};

// ─── Floating animation ────────────────────────────────────────────────────
export const floating: Variants = {
  initial: { y: 0 },
  animate: {
    y: [-3, 3, -3],
    transition: { duration: 3, ease: 'easeInOut', repeat: Infinity },
  },
};

// ─── Glow Pulse ─────────────────────────────────────────────────────────────
export const glowPulse: Variants = {
  initial: { opacity: 0.3, scale: 1 },
  animate: {
    opacity: [0.3, 0.7, 0.3],
    scale: [1, 1.1, 1],
    transition: { duration: 2, ease: 'easeInOut', repeat: Infinity },
  },
};

// ─── Tab indicator ──────────────────────────────────────────────────────────
export const tabIndicator: Variants = {
  initial: { scaleX: 0 },
  animate: {
    scaleX: 1,
    transition: { type: 'spring', stiffness: 500, damping: 30 },
  },
};

// ─── Notification badge ─────────────────────────────────────────────────────
export const notificationBadge: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 600, damping: 15 },
  },
};

// ─── Progress bar ───────────────────────────────────────────────────────────
export const progressBar = (targetWidth: string): Variants => ({
  initial: { width: '0%' },
  animate: {
    width: targetWidth,
    transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
  },
});

// ─── Skeleton loading ───────────────────────────────────────────────────────
export const skeletonPulse: Variants = {
  initial: { opacity: 0.3 },
  animate: {
    opacity: [0.3, 0.6, 0.3],
    transition: { duration: 1.5, ease: 'easeInOut', repeat: Infinity },
  },
};
