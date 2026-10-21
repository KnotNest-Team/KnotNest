import { useState } from 'react';
import { ShieldCheck, IndianRupee } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';
import { paymentApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { errMsg, inr } from '../utils/format';

const loadCheckout = () => new Promise((resolve, reject) => {
  if (window.Razorpay) return resolve();
  const s = document.createElement('script');
  s.src = 'https://checkout.razorpay.com/v1/checkout.js';
  s.onload = resolve; s.onerror = () => reject(new Error('Could not load Razorpay. Check your internet connection.'));
  document.body.appendChild(s);
});

/**
 * Pays the booking advance. With Razorpay keys on the server this opens Razorpay Checkout (test mode);
 * without keys (development) it shows a clearly labelled simulated payment so the flow can be demonstrated.
 */
export default function PayAdvanceButton({ booking, onPaid }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(null);

  const verify = async (body) => {
    await paymentApi.verify(body);
    toast.success('Advance paid. Your date is locked in.');
    setDemo(null); onPaid?.();
  };

  const start = async () => {
    setBusy(true);
    try {
      const o = await paymentApi.order(booking._id);
      if (o.mode === 'demo') { setDemo(o); return; }
      await loadCheckout();
      const rzp = new window.Razorpay({
        key: o.keyId, order_id: o.orderId, amount: o.amountPaise, currency: o.currency, name: o.name, description: o.description, prefill: o.prefill,
        theme: { color: '#6E1E2A' },
        handler: (r) => verify({ orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }).catch((e) => toast.error(errMsg(e))),
        modal: { ondismiss: () => toast.info('Payment cancelled. You can pay the advance any time.') },
      });
      rzp.on('payment.failed', (r) => toast.error(r.error?.description || 'Payment failed. No money was taken.'));
      rzp.open();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <>
      <Button size="sm" icon={IndianRupee} loading={busy} onClick={start}>Pay advance</Button>
      <Modal open={!!demo} onClose={() => setDemo(null)} size="sm" title="Test payment" subtitle={demo?.description}
        footer={<><Button variant="ghost" onClick={() => setDemo(null)}>Cancel</Button><Button loading={busy} onClick={() => { setBusy(true); verify({ orderId: demo.orderId }).catch((e) => toast.error(errMsg(e))).finally(() => setBusy(false)); }}>Simulate successful payment</Button></>}>
        <div className="text-center">
          <p className="font-display text-5xl text-maroon">{inr(demo?.amount)}</p>
          <p className="mt-1 text-sm text-muted">Booking advance</p>
          <p className="mt-5 flex items-start gap-2 rounded-xl bg-gold/10 p-3 text-left text-sm text-[#6d4c22]"><ShieldCheck size={18} className="mt-0.5 shrink-0" /><span>Razorpay keys aren't set on this server, so this is a simulated payment for development. No money moves. Add <code className="break-all">RAZORPAY_KEY_ID</code> and <code className="break-all">RAZORPAY_KEY_SECRET</code> to server/.env to use Razorpay test mode.</span></p>
        </div>
      </Modal>
    </>
  );
}
