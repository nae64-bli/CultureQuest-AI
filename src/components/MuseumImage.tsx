import { useState } from 'react';
import { Landmark } from 'lucide-react';

interface MuseumImageProps {
  src?: string;
  alt: string;
  categoria?: string;
  className?: string;
}

export function MuseumImage({
  src,
  alt,
  categoria,
  className = '',
}: MuseumImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center bg-[#F3EFE7] text-[#57534E] border-b border-stone-200 select-none ${className}`}
        role="img"
        aria-label={alt}
      >
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 25%, rgba(154, 52, 18, 0.08), transparent 55%), radial-gradient(circle at 80% 75%, rgba(30, 58, 138, 0.07), transparent 50%)',
          }}
        />
        <div className="relative z-10 flex flex-col items-center text-center px-6 py-4">
          <Landmark className="w-7 h-7 text-[#9A3412]/70 mb-2" strokeWidth={1.4} />
          <span className="font-serif text-base font-medium text-[#1C1917] line-clamp-2 max-w-[24ch]">
            {alt}
          </span>
          {categoria && (
            <span className="mt-1 text-xs tracking-wider uppercase text-[#78716C]">
              {categoria}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover bg-[#F3EFE7] ${className}`}
      loading="lazy"
    />
  );
}
