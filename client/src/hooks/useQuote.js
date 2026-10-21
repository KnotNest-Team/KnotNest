import { useEffect, useRef, useState } from 'react';
import { bookingApi } from '../services/api';
import { errMsg } from '../utils/format';

/**
 * Live server price for a selection. `body` is the quote request ({ items } or { vendor, days }) or null.
 * Re-quotes shortly after every change; answers to older requests are ignored.
 */
export default function useQuote(body, delay = 250) {
  const [state, setState] = useState({ data: null, loading: false, error: '' });
  const seq = useRef(0);
  const key = body ? JSON.stringify(body) : '';
  useEffect(() => {
    if (!key) { setState({ data: null, loading: false, error: '' }); return undefined; }
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: '' }));
    const t = setTimeout(async () => {
      try {
        const data = await bookingApi.quote(JSON.parse(key));
        if (id === seq.current) setState({ data, loading: false, error: '' });
      } catch (e) {
        if (id === seq.current) setState({ data: null, loading: false, error: errMsg(e) });
      }
    }, delay);
    return () => clearTimeout(t);
  }, [key, delay]);
  return state;
}
