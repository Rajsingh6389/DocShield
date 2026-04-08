import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

export const Input = forwardRef(({ 
  label, 
  icon: Icon, 
  type = 'text', 
  error,
  className = '', 
  ...props 
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className="flex flex-col w-full relative">
      {label && (
        <label className="text-xs font-hud tracking-widest text-cyber-cyan mb-2 uppercase flex items-center gap-2">
          {label}
        </label>
      )}
      
      <div className={`relative group ${className}`}>
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyber-cyan transition-colors z-10">
            <Icon size={18} />
          </div>
        )}
        
        <input
          ref={ref}
          type={inputType}
          onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
          className={`
            w-full bg-obsidian-900/60 border border-white/10 text-white placeholder-gray-500
            text-sm font-mono py-3 rounded
            focus:outline-none focus:border-cyber-cyan focus:ring-1 focus:ring-cyber-cyan
            transition-all duration-300
            ${Icon ? 'pl-10' : 'pl-4'}
            ${type === 'password' ? 'pr-10' : 'pr-4'}
            ${error ? 'border-cyber-red focus:border-cyber-red focus:ring-cyber-red' : ''}
          `}
          {...props}
        />

        {/* Focus Glow Indicator */}
        <motion.div 
          initial={false}
          animate={{ opacity: isFocused ? 1 : 0 }}
          className="absolute inset-0 rounded pointer-events-none shadow-[0_0_15px_rgba(0,229,255,0.15)_inset] border border-cyber-cyan/30"
        />

        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-cyber-cyan transition-colors z-10"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      
      {error && (
        <span className="text-xs text-cyber-red mt-1 font-mono tracking-wide">{error}</span>
      )}
    </div>
  );
});
Input.displayName = 'Input';
