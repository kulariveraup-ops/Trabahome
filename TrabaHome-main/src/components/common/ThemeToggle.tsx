import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, type Theme } from '../../context/ThemeContext.tsx';

interface ThemeToggleProps {
  variant?: 'icon' | 'pill' | 'selector' | 'floating';
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'icon',
  className = '',
  showLabel = false,
}) => {
  const { theme, resolvedTheme, isDark, setTheme, toggleTheme } = useTheme();

  // 1. Selector variant (for Settings pages: Light | Dark | System)
  if (variant === 'selector') {
    const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
      { value: 'light', label: 'Light', icon: <Sun size={15} /> },
      { value: 'dark', label: 'Dark', icon: <Moon size={15} /> },
      { value: 'system', label: 'System', icon: <Monitor size={15} /> },
    ];

    return (
      <div className={`inline-flex p-1 bg-gray-100 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 ${className}`}>
        {options.map((opt) => {
          const isActive = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-slate-700 text-[#004A8C] dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // 2. Pill variant with label
  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
          isDark
            ? 'bg-slate-800 text-yellow-300 border-slate-700 hover:bg-slate-700'
            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
        } ${className}`}
      >
        {isDark ? <Moon size={15} className="text-yellow-400" /> : <Sun size={15} className="text-amber-500" />}
        <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
      </button>
    );
  }

  // 3. Floating Quick Switcher (left downside floating button)
  if (variant === 'floating') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className={`fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-xl border transition-all duration-300 active:scale-90 hover:scale-105 cursor-pointer backdrop-blur-md ${
          isDark
            ? 'bg-slate-800/90 text-yellow-300 border-slate-700 hover:bg-slate-700 hover:border-slate-600 hover:shadow-yellow-500/10'
            : 'bg-white/95 text-gray-700 border-gray-200 hover:bg-white hover:border-gray-300 hover:shadow-2xl'
        } ${className}`}
      >
        {isDark ? (
          <Sun size={21} className="text-amber-400 transition-transform duration-500 hover:rotate-90" />
        ) : (
          <Moon size={21} className="text-slate-700 transition-transform duration-500 hover:-rotate-12" />
        )}
      </button>
    );
  }

  // 4. Default icon button (for Navbars & Headers)
  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer ${
        isDark
          ? 'bg-slate-800 text-yellow-300 hover:bg-slate-700 border border-slate-700'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
      } ${className}`}
    >
      {isDark ? (
        <Sun size={17} className="text-amber-400" />
      ) : (
        <Moon size={17} className="text-slate-700" />
      )}
      {showLabel && (
        <span className="ml-2 text-xs font-semibold">
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
