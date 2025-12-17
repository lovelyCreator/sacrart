import React from 'react';

interface EuroIconProps {
  className?: string;
}

export const EuroIcon: React.FC<EuroIconProps> = ({ className = "h-6 w-6" }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 10h8M6 14h8M18 6C16.5 4.5 14.3 4 12 4c-4.4 0-8 3.6-8 8s3.6 8 8 8c2.3 0 4.5-.5 6-2" />
    </svg>
  );
};



