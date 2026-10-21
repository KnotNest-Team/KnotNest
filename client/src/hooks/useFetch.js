import { useCallback, useEffect, useRef, useState } from 'react';
import { errMsg } from '../utils/format';

/** const { data, loading, error, reload, setData } = useFetch(() => api(), [deps]) */
export default function useFetch(fn, deps = [], { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try { setData(await fnRef.current()); } catch (e) { setError(errMsg(e)); } finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (enabled) run(); }, [enabled, ...deps]);
  return { data, setData, loading, error, reload: () => run(true) };
}
