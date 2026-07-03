/**
 * Reusable animated UI primitives with advanced motion graphics.
 */
import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView, useMotionValue, useTransform, useSpring } from 'framer-motion';

// ─── Animated Counter ───────────────────────────────────────────────────────
// Counts up from 0 to a target value with spring physics
interface AnimatedCounterProps {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  decimals = 0,
  duration = 1.5,
  className = '',
  prefix = '',
  suffix = '',
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isInView || hasAnimated.current) return;
    hasAnimated.current = true;

    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(eased * value);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, value, duration]);

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {prefix}{displayValue.toFixed(decimals)}{suffix}
    </motion.span>
  );
};

// ─── Animated Progress Ring ─────────────────────────────────────────────────
interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  colorClass?: string;
  glowColor?: string;
  children?: React.ReactNode;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  size = 120,
  strokeWidth = 6,
  colorClass = 'stroke-accent',
  glowColor = 'rgba(99,102,241,0.4)',
  children,
}) => {
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true });
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg ref={ref} width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-borderLight/30"
        />
        {/* Animated progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={colorClass}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={isInView ? { strokeDashoffset: offset } : {}}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
};

// ─── Magnetic Hover Card ────────────────────────────────────────────────────
// Tilts towards cursor for premium 3D feel
interface MagneticCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  onClick?: () => void;
}

export const MagneticCard: React.FC<MagneticCardProps> = ({
  children,
  className = '',
  intensity = 8,
  onClick,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-0.5, 0.5], [intensity, -intensity]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-intensity, intensity]);

  const springRotateX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const springRotateY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(px);
    y.set(py);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        rotateX: springRotateX,
        rotateY: springRotateY,
        transformPerspective: 1000,
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.div>
  );
};

// ─── Animated Gradient Orb ──────────────────────────────────────────────────
// Decorative morphing background orb
interface GradientOrbProps {
  color1?: string;
  color2?: string;
  size?: number;
  className?: string;
}

export const GradientOrb: React.FC<GradientOrbProps> = ({
  color1 = 'rgba(99, 102, 241, 0.15)',
  color2 = 'rgba(139, 92, 246, 0.1)',
  size = 300,
  className = '',
}) => (
  <motion.div
    className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
    style={{
      width: size,
      height: size,
      background: `radial-gradient(circle, ${color1}, ${color2}, transparent 70%)`,
    }}
    animate={{
      scale: [1, 1.2, 1],
      opacity: [0.5, 0.8, 0.5],
      rotate: [0, 180, 360],
      borderRadius: ['60% 40% 30% 70%/60% 30% 70% 40%', '30% 60% 70% 40%/50% 60% 30% 60%', '60% 40% 30% 70%/60% 30% 70% 40%'],
    }}
    transition={{
      duration: 8,
      ease: 'easeInOut',
      repeat: Infinity,
    }}
  />
);

// ─── Particle Field ─────────────────────────────────────────────────────────
// Floating ambient particles
interface ParticleFieldProps {
  count?: number;
  color?: string;
}

export const ParticleField: React.FC<ParticleFieldProps> = ({
  count = 20,
  color = 'rgba(99, 102, 241, 0.3)',
}) => {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 4 + 3,
    delay: Math.random() * 2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: color,
          }}
          animate={{
            y: [0, -20, 0],
            x: [0, Math.random() * 10 - 5, 0],
            opacity: [0, 0.8, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

// ─── Scan Line Effect ───────────────────────────────────────────────────────
export const ScanLine: React.FC<{ className?: string }> = ({ className = '' }) => (
  <motion.div
    className={`absolute left-0 right-0 h-px pointer-events-none ${className}`}
    style={{
      background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)',
    }}
    animate={{
      top: ['0%', '100%'],
      opacity: [0, 1, 1, 0],
    }}
    transition={{
      duration: 3,
      repeat: Infinity,
      ease: 'linear',
    }}
  />
);

// ─── Reveal on Scroll ───────────────────────────────────────────────────────
interface RevealProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
}

export const Reveal: React.FC<RevealProps> = ({
  children,
  className = '',
  direction = 'up',
  delay = 0,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  const directionMap = {
    up: { y: 30, x: 0 },
    down: { y: -30, x: 0 },
    left: { y: 0, x: 30 },
    right: { y: 0, x: -30 },
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{
        opacity: 0,
        y: directionMap[direction].y,
        x: directionMap[direction].x,
        filter: 'blur(4px)',
      }}
      animate={isInView ? {
        opacity: 1,
        y: 0,
        x: 0,
        filter: 'blur(0px)',
      } : {}}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
};

// ─── Shimmer Loading Skeleton ───────────────────────────────────────────────
interface SkeletonProps {
  width?: string;
  height?: string;
  rounded?: string;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  rounded = 'rounded-lg',
  className = '',
}) => (
  <div
    className={`bg-elevated/50 shimmer-bg animate-shimmer ${rounded} ${className}`}
    style={{ width, height }}
  />
);

// ─── Animated Status Dot ────────────────────────────────────────────────────
interface StatusDotProps {
  status: 'active' | 'success' | 'warning' | 'error' | 'idle';
  size?: number;
}

const statusColorMap = {
  active: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-critical',
  idle: 'bg-tertiary',
};

const statusGlowMap = {
  active: 'shadow-[0_0_8px_rgba(99,102,241,0.8)]',
  success: 'shadow-[0_0_8px_rgba(16,185,129,0.8)]',
  warning: 'shadow-[0_0_8px_rgba(245,158,11,0.8)]',
  error: 'shadow-[0_0_8px_rgba(239,68,68,0.8)]',
  idle: '',
};

export const StatusDot: React.FC<StatusDotProps> = ({ status, size = 8 }) => (
  <span className="relative inline-flex">
    {status !== 'idle' && (
      <motion.span
        className={`absolute inline-flex h-full w-full rounded-full ${statusColorMap[status]} opacity-75`}
        animate={{ scale: [1, 2], opacity: [0.75, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{ width: size, height: size }}
      />
    )}
    <span
      className={`relative inline-flex rounded-full ${statusColorMap[status]} ${statusGlowMap[status]}`}
      style={{ width: size, height: size }}
    />
  </span>
);
