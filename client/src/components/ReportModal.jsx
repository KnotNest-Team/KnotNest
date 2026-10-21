import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { Textarea } from './Field';
import { useToast } from '../context/ToastContext';
import { errMsg } from '../utils/format';

/** Asks for a reason, then calls onSubmit(reason). Reporting is what allows an admin to read private content. */
export default function ReportModal({ open, onClose, onSubmit, title = 'Report', what = 'this' }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try { const r = await onSubmit(reason.trim()); toast.success(r?.message || 'Reported'); setReason(''); onClose(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={`Our team will be able to read ${what} to investigate. Every review is logged.`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="danger" loading={busy} disabled={reason.trim().length < 5} onClick={send}>Send report</Button></>}>
      <Textarea label="What went wrong?" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Spam, abusive language, asking for payment outside KnotNest" />
    </Modal>
  );
}
