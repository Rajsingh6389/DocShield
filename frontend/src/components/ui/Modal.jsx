import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children, className = '' }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className={`relative w-full max-w-lg glass-panel rounded-lg shadow-2xl border border-white/10 overflow-hidden ${className}`}
          >
            {/* Top neon strip */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-cyber-cyan shadow-[0_0_10px_rgba(0,229,255,0.5)]" />

            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h2 className="text-lg font-hud font-bold tracking-wider text-white">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {children}
            </div>
            
            {/* Scanline effect over modal */}
            <div className="pointer-events-none absolute inset-0 opacity-10 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
