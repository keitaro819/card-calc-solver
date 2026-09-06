import React from 'react';
import { Operator } from '../types.ts';
import { motion } from 'motion/react';

interface OperatorButtonProps {
  id?: string;
  operator: Operator;
  isSelected?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const OperatorButton: React.FC<OperatorButtonProps> = ({
  id,
  operator,
  isSelected = false,
  onClick,
  disabled = false,
}) => {
  return (
    <motion.button
      id={id}
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.08 }}
      whileTap={disabled ? {} : { scale: 0.94 }}
      className={`
        relative w-13 h-13 sm:w-15 sm:h-15 rounded-2xl flex items-center justify-center
        transition-all duration-200 select-none font-sans
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${
          isSelected
            ? 'bg-blue-600 text-white border-2 border-blue-600 ring-4 ring-blue-500/20 shadow-md shadow-blue-500/25 scale-105'
            : 'bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-600 shadow-sm'
        }
      `}
    >
      <span className="text-2xl sm:text-3xl font-black leading-none">
        {operator}
      </span>
    </motion.button>
  );
};
