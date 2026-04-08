import React from 'react';
import { motion } from 'framer-motion';

export function Card({ children, className = '', hover = false, ...props }) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, scale: 1.01 } : {}}
      transition={{ type: 'spring', stiffness: 300 }}
      className={`glass-panel rounded-lg p-6 relative overflow-hidden ${className}`}
      {...props}
    >
      {/* Subtle top edge glow */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      {/* Content wrapper to stay above background elements */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
