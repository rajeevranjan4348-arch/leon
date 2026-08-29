import React from 'react';

interface CirclePlusIconProps {
  size?: number | string;
  className?: string;
}

/**
 * Circle Plus Icon (From Uiverse.io by catraco)
 */
export const CirclePlusIcon: React.FC<CirclePlusIconProps> = ({
  size = 22,
  className = '',
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`stroke-zinc-400 fill-none group-hover:fill-zinc-800 group-hover:stroke-cyan-400 group-active:stroke-zinc-200 group-active:fill-zinc-600 group-active:duration-0 duration-300 ${className}`}
    >
      <path
        d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z"
        strokeWidth="1.5"
      />
      <path d="M8 12H16" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 16V8" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

export default CirclePlusIcon;

