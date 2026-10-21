import { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const TONES = { success: 'text-emerald-600', error: 'text-red-600', info: 'text-gold' };

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const dismiss = useCallback((id) => setItems((s) => s.filter((t) => t.id !== id)), []);
  const push = useCallback((type, message) => {
    const id = Math.random().toString(36).slice(2);
    setItems((s) => [...s.slice(-3), { id, type, message }]);
    setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);
  const toast = { success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2 sm:right-6 sm:top-6" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => {
            const Icon = ICONS[t.type];
            return (
              <motion.div key={t.id} layout initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
                className="pointer-events-auto flex items-start gap-3 rounded-xl border border-ink/10 bg-white px-4 py-3 font-sans text-sm shadow-card">
                <Icon size={18} className={`mt-0.5 shrink-0 ${TONES[t.type]}`} />
                <p className="flex-1 text-ink">{t.message}</p>
                <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-muted hover:text-ink"><X size={16} /></button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
