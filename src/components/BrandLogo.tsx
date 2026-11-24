import React, { useId } from 'react';

interface BrandLogoProps {
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = 'w-7 h-7' }) => {
  const uid = useId().replace(/:/g, '');
  const gradDish = `mg-dish-${uid}`;
  const gradWave = `mg-wave-${uid}`;

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradDish} x1="12" y1="18" x2="48" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#b8ceff" />
          <stop offset="50%" stopColor="#6c8cff" />
          <stop offset="100%" stopColor="#4c6ef5" />
        </linearGradient>
        <linearGradient id={gradWave} x1="30" y1="8" x2="56" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c7dcff" />
          <stop offset="100%" stopColor="#5b7cfa" />
        </linearGradient>
      </defs>

      {/* Sleek triangular pedestal */}
      <path
        d="M17.5 41.5L13.5 52.5C13.1 53.6 13.9 54.8 15.1 54.8H26.4C27.6 54.8 28.4 53.5 27.9 52.4L25 46.8"
        fill={`url(#${gradDish})`}
        fillOpacity="0.92"
      />

      {/* Parabolic dish bowl */}
      <path
        d="M18.6 19.4C12.8 26.2 14.2 37.2 21.8 44.8C29.4 52.4 40.4 53.8 47.2 48C48.4 47 48.5 45.2 47.4 44.1L22.5 19.2C21.4 18.1 19.6 18.2 18.6 19.4Z"
        fill={`url(#${gradDish})`}
      />

      {/* Inner bowl depth + rim highlight */}
      <ellipse
        cx="32.8"
        cy="33.8"
        rx="5.2"
        ry="18.2"
        transform="rotate(-45 32.8 33.8)"
        fill="#0f1422"
        fillOpacity="0.45"
        stroke="#c7d8ff"
        strokeWidth="2.2"
      />

      {/* Tapered feed mast + luminous focal node */}
      <path
        d="M27.6 34.4L34.4 27.6L36.8 29.9L30 36.7Z"
        fill={`url(#${gradWave})`}
      />
      <circle cx="37.2" cy="26.8" r="3.3" fill="#dce8ff" />

      {/* Two concentric wireless signal arcs */}
      <path
        d="M32.5 17.5C38.8 17.5 46.5 25.2 46.5 31.5"
        stroke={`url(#${gradWave})`}
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <path
        d="M31.5 10.5C41.8 10.5 53.5 22.2 53.5 32.5"
        stroke={`url(#${gradWave})`}
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeOpacity="0.88"
      />
    </svg>
  );
};
