import React from 'react';
import WorkerNotificationBell from '../workerNotifications/WorkerNotificationBell.tsx';
import MessagesSummaryButton from '../chat/MessagesSummaryButton.tsx';

interface HeaderProps {
  onLogoClick: () => void;
}

const Header = React.forwardRef<HTMLElement, HeaderProps>(({ onLogoClick }, ref) => {
  return (
    <header
      ref={ref}
      className="w-full bg-[#F9F5F0] border-b border-[#E7E2DA] fixed top-0 left-0 right-0 z-50 shadow-sm"
    >
      <div className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
        {/* Logo container width matches sidebar width for alignment on desktop */}
        <div className="w-auto lg:w-[260px] flex items-center cursor-pointer" onClick={onLogoClick}>
          <img 
            src="/assets/Logo.png"
            alt="TrabaHome"
            className="h-7 sm:h-8 w-auto"
          />
        </div>
        
        <div className="flex-1 flex justify-end items-center gap-2 sm:gap-3">
          <WorkerNotificationBell />
          <MessagesSummaryButton role="worker" />
        </div>
      </div>
    </header>
  );
});

Header.displayName = 'Header';

export default Header;
