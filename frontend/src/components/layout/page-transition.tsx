// frontend/src/components/layout/page-transition.tsx
"use client";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

export function PageTransition({ children, className }: Readonly<{ children: React.ReactNode, className?: string }>) {
  const pathname = usePathname();
  return (
    <motion.div
      key={pathname}
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}