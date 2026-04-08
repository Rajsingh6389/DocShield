import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  className = '', 
  ...props 
}) {
  const baseStyle = "relative inline-flex items-center justify-center font-bold tracking-wide transition-all overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed z-10";
  
  const variants = {
    primary: "bg-cyber-green text-obsidian-900 shadow-[0_0_15px_rgba(0,255,65,0.4)] hover:shadow-[0_0_25px_rgba(0,255,65,0.6)] border border-cyber-green",
    secondary: "bg-obsidian-800/80 text-cyber-cyan border border-cyber-cyan/30 shadow-[0_0_15px_rgba(0,229,255,0.1)] hover:border-cyber-cyan hover:shadow-[0_0_20px_rgba(0,229,255,0.3)] backdrop-blur-sm",
    danger: "bg-obsidian-800/80 text-cyber-red border border-cyber-red/30 shadow-[0_0_15px_rgba(255,0,60,0.1)] hover:border-cyber-red hover:shadow-[0_0_20px_rgba(255,0,60,0.3)] backdrop-blur-sm",
    ghost: "bg-transparent text-gray-400 hover:text-white hover:bg-obsidian-700"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-4 text-base"
  };

  return (
    <motion.button
      whileHover={{ scale: isLoading || props.disabled ? 1 : 1.02 }}
      whileTap={{ scale: isLoading || props.disabled ? 1 : 0.98 }}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {/* Glow highlight effect */}
      <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-10 transition-opacity pointer-events-none" />
      
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : null}
      <span className="relative font-mono">{children}</span>
    </motion.button>
  );
}
