import { Link } from 'react-router-dom';
import { GitCompareArrows, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCompare } from '../context/CompareContext';

/** Floating tray shown while vendors are selected for comparison. */
export default function CompareTray() {
  const { ids, clear } = useCompare();
  return (
    <AnimatePresence>
      {ids.length > 0 && (
        <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-full bg-ink-bg px-5 py-3 font-sans text-sm text-ivory shadow-2xl">
          <GitCompareArrows size={18} className="text-gold-lt" />
          <span>{ids.length} vendor{ids.length > 1 ? 's' : ''} selected</span>
          <Link to="/customer/compare" className="rounded-full bg-maroon px-4 py-1.5 font-medium hover:bg-maroon-dk">Compare now</Link>
          <button onClick={clear} aria-label="Clear comparison" className="text-ivory/60 hover:text-ivory"><X size={16} /></button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
