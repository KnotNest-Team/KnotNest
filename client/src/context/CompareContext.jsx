import { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from './ToastContext';

const CompareContext = createContext(null);
export const useCompare = () => useContext(CompareContext);
const KEY = 'knotnest_compare';
const MAX = 4;

export function CompareProvider({ children }) {
  const toast = useToast();
  const [ids, setIds] = useState(() => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } });
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* storage unavailable */ } }, [ids]);

  const toggle = (id) => {
    if (ids.includes(id)) return setIds(ids.filter((x) => x !== id));
    if (ids.length >= MAX) return toast.info(`You can compare up to ${MAX} vendors`);
    setIds([...ids, id]);
    toast.success('Added to compare');
  };
  return <CompareContext.Provider value={{ ids, toggle, clear: () => setIds([]), has: (id) => ids.includes(id) }}>{children}</CompareContext.Provider>;
}
