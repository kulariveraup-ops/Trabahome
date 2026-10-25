import React, { useEffect, useMemo, useState } from 'react';

interface HomeownerAvatarProps {
  src?: string | null;
  name?: string | null;
  alt?: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  initialsClassName?: string;
}

const getInitials = (name?: string | null) => {
  const value = String(name || 'Homeowner').trim();
  if (!value) return 'H';
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0] || 'H'}${words[1][0] || ''}`.toUpperCase();
};

const HomeownerAvatar: React.FC<HomeownerAvatarProps> = ({
  src,
  name,
  alt,
  className = 'h-12 w-12',
  imageClassName = 'object-cover',
  fallbackClassName = 'bg-gradient-to-br from-[#EAF4FF] to-[#F6FBFF] text-[#0B3B68]',
  initialsClassName = 'text-[11px] font-bold',
}) => {
  const resolvedSrc = String(src || '').trim();
  const resolvedName = String(name || 'Homeowner').trim();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [resolvedSrc]);

  const initials = useMemo(() => getInitials(resolvedName), [resolvedName]);

  return (
    <div className={`relative overflow-hidden rounded-full shrink-0 ${className}`.trim()}>
      {resolvedSrc && !hasError ? (
        <img
          src={resolvedSrc}
          alt={alt || resolvedName || 'Homeowner'}
          className={`h-full w-full ${imageClassName}`.trim()}
          onError={() => setHasError(true)}
        />
      ) : (
        <div className={`flex h-full w-full items-center justify-center ${fallbackClassName}`.trim()}>
          <span className={initialsClassName}>{initials}</span>
        </div>
      )}
    </div>
  );
};

export default HomeownerAvatar;
