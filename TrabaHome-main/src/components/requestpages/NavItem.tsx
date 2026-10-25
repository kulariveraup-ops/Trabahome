import React from 'react';
import type { NavItemProps } from '../../types/Worker.types.ts';

const NavItem: React.FC<NavItemProps> = ({ icon, label, active = false, onClick }) => (
  <div
    onClick={onClick}
    className={`group flex items-center gap-4 px-8 py-4 cursor-pointer transition-all duration-200 border-l-[4px] rounded-r-2xl
      ${active
        ? 'bg-[#00A651]/[0.06] text-[#0B3B68] border-[#00A651] font-semibold'
        : 'text-gray-400 border-transparent hover:bg-[#0B3B68]/[0.04] hover:translate-x-0.5'}`}
  >
    <div
      className={`w-5 h-5 flex items-center justify-center transition-colors duration-200 ${
        active ? 'text-[#00A651]' : 'text-gray-400 group-hover:text-[#0B3B68]'
      }`}
    >
      {icon}
    </div>
    <span
      className={`text-sm ${
        active ? 'font-semibold text-[#0B3B68]' : 'font-medium text-gray-500 group-hover:text-[#0B3B68]'
      }`}
    >
      {label}
    </span>
  </div>
);

export default NavItem;
