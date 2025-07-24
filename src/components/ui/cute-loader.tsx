import React from 'react';

interface CuteLoaderProps {
  size?: number;
  className?: string;
}

export function CuteLoader({ size = 80, className = "" }: CuteLoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* Cute animated character */}
      <div className="relative mb-3">
        {/* Head */}
        <div 
          className="rounded-full bg-gradient-to-br from-yellow-300 to-yellow-400 relative animate-pulse"
          style={{ width: size * 0.6, height: size * 0.6 }}
        >
          {/* Eyes */}
          <div className="absolute flex justify-between px-3 pt-2" style={{ top: '25%', left: '20%', right: '20%' }}>
            <div 
              className="rounded-full bg-gray-800 animate-bounce"
              style={{ 
                width: size * 0.08, 
                height: size * 0.08,
                animationDelay: '0s',
                animationDuration: '1s'
              }}
            />
            <div 
              className="rounded-full bg-gray-800 animate-bounce"
              style={{ 
                width: size * 0.08, 
                height: size * 0.08,
                animationDelay: '0.1s',
                animationDuration: '1s'
              }}
            />
          </div>
          
          {/* Mouth - cute smile */}
          <div 
            className="absolute left-1/2 transform -translate-x-1/2 border-b-2 border-gray-800 rounded-full animate-pulse"
            style={{ 
              bottom: '30%',
              width: size * 0.15,
              height: size * 0.08,
              animationDelay: '0.5s'
            }}
          />
        </div>
      </div>
      
      {/* Animated dots below */}
      <div className="flex space-x-1">
        <div 
          className="rounded-full bg-blue-400 animate-bounce"
          style={{ 
            width: size * 0.12, 
            height: size * 0.12,
            animationDelay: '0s',
            animationDuration: '1.4s'
          }}
        />
        <div 
          className="rounded-full bg-pink-400 animate-bounce"
          style={{ 
            width: size * 0.12, 
            height: size * 0.12,
            animationDelay: '0.2s',
            animationDuration: '1.4s'
          }}
        />
        <div 
          className="rounded-full bg-green-400 animate-bounce"
          style={{ 
            width: size * 0.12, 
            height: size * 0.12,
            animationDelay: '0.4s',
            animationDuration: '1.4s'
          }}
        />
      </div>
    </div>
  );
}