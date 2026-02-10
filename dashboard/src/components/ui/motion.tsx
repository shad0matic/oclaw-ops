"use client"

import { motion, MotionProps, useReducedMotion } from "framer-motion"
import { forwardRef } from "react"

/**
 * Motion wrapper that respects user's motion preferences
 * Automatically disables animations when prefers-reduced-motion is set
 */

export const MotionDiv = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & MotionProps
>(({ children, ...props }, ref) => {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div ref={ref} {...(props as any)}>{children}</div>
  }

  return (
    <motion.div ref={ref} {...props}>
      {children}
    </motion.div>
  )
})
MotionDiv.displayName = "MotionDiv"

export const MotionSpan = forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & MotionProps
>(({ children, ...props }, ref) => {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <span ref={ref} {...(props as any)}>{children}</span>
  }

  return (
    <motion.span ref={ref} {...props}>
      {children}
    </motion.span>
  )
})
MotionSpan.displayName = "MotionSpan"

// Reusable animation variants
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
}

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.25 }
}

export const slideIn = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: { duration: 0.25 }
}

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2 }
}

// Stagger children animation
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05
    }
  }
}

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2 }
}
