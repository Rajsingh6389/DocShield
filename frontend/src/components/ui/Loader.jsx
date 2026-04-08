import React from 'react';
import { motion } from 'framer-motion';

export function Loader({ size = 'md', className = '', text = '' }) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  const ringSizes = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-20 h-20'
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <div className={`relative ${sizes[size]} flex items-center justify-center`}>
        {/* Outer scanning ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-0 rounded-full border border-cyber-cyan/30 border-t-cyber-cyan shadow-[0_0_15px_rgba(0,229,255,0.2)]`}
        />
        
        {/* Inner pulsing ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className={`absolute ${ringSizes[size]} rounded-full border border-cyber-green/30 border-b-cyber-green shadow-[0_0_10px_rgba(0,255,65,0.2)]`}
        />

        {/* Center core */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-2 h-2 bg-white rounded-full shadow-[0_0_8px_white]"
        />
      </div>

      {text && (
        <div className="font-mono text-xs tracking-widest text-cyber-cyan animate-pulse">
          {text}
        </div>
      )}
    </div>
  );
}
