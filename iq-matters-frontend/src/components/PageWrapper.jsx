import React from "react";
import { motion } from "framer-motion";

export const pageTransition = {
  duration: 0.35,
  ease: "easeOut"
};

export const cardTransition = {
  duration: 0.28,
  ease: "easeOut"
};

export const buttonMotionProps = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.98 },
  transition: {
    duration: 0.18,
    ease: "easeOut"
  }
};

export const cardMotionProps = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: cardTransition
};

export function getRowMotion(index = 0) {
  return {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.24,
      delay: Math.min(index * 0.04, 0.2),
      ease: "easeOut"
    }
  };
}

export default function PageWrapper({ children, className = "" }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}
