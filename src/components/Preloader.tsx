import React from 'react';

interface PreloaderProps {
  isVisible: boolean;
}

export const Preloader: React.FC<PreloaderProps> = ({ isVisible }) => {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0c2340 100%)',
        transition: 'opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1), transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(1.04)',
        pointerEvents: isVisible ? 'all' : 'none',
      }}
    >
      {/* Background radial glow */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, transparent 65%)',
        }}
      />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-20"
          style={{
            width: `${6 + i * 4}px`,
            height: `${6 + i * 4}px`,
            background: `hsl(${220 + i * 15}, 80%, 70%)`,
            top: `${15 + i * 12}%`,
            left: `${10 + i * 14}%`,
            animation: `bounce-dot ${1.4 + i * 0.2}s ease-in-out infinite`,
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}

      {/* Logo container with animated ring */}
      <div className="relative mb-8">
        {/* Outer glowing ring */}
        <div
          className="absolute inset-0 rounded-[2.5rem]"
          style={{
            background: 'conic-gradient(from 0deg, #6366f1, #3b82f6, #0ea5e9, #6366f1)',
            padding: '3px',
            animation: 'spin 3s linear infinite',
            borderRadius: '2.2rem',
            margin: '-4px',
          }}
        />
        <div
          className="absolute inset-0 rounded-[2.2rem]"
          style={{
            background: 'linear-gradient(135deg, #0f172a, #1e1b4b)',
            margin: '-1px',
          }}
        />

        {/* Logo image */}
        <div
          className="relative z-10"
          style={{
            animation: 'preloader-pulse 1.8s ease-in-out infinite',
          }}
        >
          <img
            src="/logo.jpg"
            alt="PD Holiday Villas"
            className="w-28 h-28 rounded-[2rem] object-cover shadow-2xl"
            style={{
              boxShadow: '0 0 40px rgba(99, 102, 241, 0.4), 0 20px 60px rgba(0,0,0,0.5)',
            }}
          />
        </div>
      </div>

      {/* App name */}
      <h1
        className="text-3xl font-bold text-white tracking-tight mb-1"
        style={{
          fontFamily: 'Outfit, Inter, sans-serif',
          animation: 'fade-in 0.8s ease-out 0.3s both',
          textShadow: '0 0 30px rgba(99,102,241,0.5)',
        }}
      >
        PDHV Management System
      </h1>

      {/* Subtitle */}
      <p
        className="text-blue-300 text-sm font-medium mb-10"
        style={{ animation: 'fade-in 0.8s ease-out 0.5s both' }}
      >
        Homestay Management System
      </p>

      {/* Shimmer progress bar */}
      <div
        className="w-48 h-1 rounded-full overflow-hidden mb-6"
        style={{
          background: 'rgba(255,255,255,0.08)',
          animation: 'fade-in 0.5s ease-out 0.6s both',
        }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: '60%',
            background: 'linear-gradient(90deg, transparent, #6366f1, #3b82f6, #0ea5e9, transparent)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.6s linear infinite',
          }}
        />
      </div>

      {/* Loading dots */}
      <div
        className="flex items-center space-x-2"
        style={{ animation: 'fade-in 0.5s ease-out 0.7s both' }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-indigo-400"
            style={{
              animation: `bounce-dot 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </div>

      {/* Footer */}
      <p
        className="absolute bottom-8 text-slate-600 text-[11px] font-medium"
        style={{ animation: 'fade-in 1s ease-out 1s both' }}
      >
        calendar.pdholidayvillas.com
      </p>
    </div>
  );
};
