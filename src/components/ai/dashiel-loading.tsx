'use client';

import { motion } from 'framer-motion';

const LOADING_LABELS = ['Pensando...', 'Analisando seus dados...', 'Cruzando indicadores...'];

export function DashielLoading({ step = 0 }: { step?: number }) {
  const label = LOADING_LABELS[step % LOADING_LABELS.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex max-w-[88%] items-center gap-3 rounded-[24px] rounded-tl-md border border-white/8 bg-white/6 px-4 py-3 text-sm text-slate-200"
    >
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((index) => (
          <motion.span
            key={index}
            className="h-2 w-2 rounded-full bg-cyan-300/80"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: index * 0.14 }}
          />
        ))}
      </div>
      <span>{label}</span>
    </motion.div>
  );
}
