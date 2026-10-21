import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation } from 'react-router-dom';
import Modal from './Modal';
import Button from './Button';
import { Input, Select, Textarea } from './Field';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { enquiryApi } from '../services/api';
import { errMsg, fieldErrors } from '../utils/format';

const EVENTS = ['Wedding', 'Engagement', 'Sangeet', 'Mehendi', 'Haldi', 'Reception', 'Pre-wedding Shoot'];

export default function EnquiryModal({ vendor, open, onClose }) {
  const { user } = useAuth();
  const toast = useToast();
  const loc = useLocation();
  const [serverErr, setServerErr] = useState({});
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    values: { name: user?.name || '', email: user?.email || '', phone: user?.phone || '', weddingDate: '', eventType: 'Wedding', guestCount: '', message: '' },
  });

  const submit = async (d) => {
    setServerErr({});
    try {
      await enquiryApi.create({ ...d, vendor: vendor._id, guestCount: d.guestCount ? Number(d.guestCount) : 0, weddingDate: d.weddingDate || undefined });
      toast.success(`Enquiry sent to ${vendor.businessName}`);
      reset(); onClose();
    } catch (e) { setServerErr(fieldErrors(e)); toast.error(errMsg(e)); }
  };

  const blocked = !user || user.role !== 'customer';
  const e = (k) => errors[k]?.message || serverErr[k];

  return (
    <Modal open={open} onClose={onClose} title="Send Enquiry" subtitle={`to ${vendor?.businessName}`}
      footer={!blocked && <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={isSubmitting} onClick={handleSubmit(submit)}>Send Enquiry</Button></>}>
      {blocked ? (
        <div className="py-6 text-center font-sans">
          <p className="text-ink-2">{user ? 'Only customer accounts can send enquiries.' : 'Please log in as a customer to contact vendors.'}</p>
          {!user && <div className="mt-5 flex justify-center gap-3"><Button to="/login" state={{ from: loc.pathname }}>Log in</Button><Button to="/register" variant="secondary">Create account</Button></div>}
        </div>
      ) : (
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(submit)} noValidate>
          <Input label="Name" error={e('name')} {...register('name', { required: 'Name is required' })} />
          <Input label="Email" type="email" error={e('email')} {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })} />
          <Input label="Phone" type="tel" error={e('phone')} {...register('phone', { required: 'Phone is required', minLength: { value: 7, message: 'Enter a valid phone number' } })} />
          <Input label="Wedding date" type="date" min={new Date().toISOString().slice(0, 10)} error={e('weddingDate')} {...register('weddingDate')} />
          <Select label="Event type" options={EVENTS} {...register('eventType')} />
          <Input label="Guest count" type="number" min="0" error={e('guestCount')} {...register('guestCount')} />
          <Textarea wrapClass="sm:col-span-2" label="Message" rows={4} placeholder="Tell them about your plans…" error={e('message')} {...register('message', { required: 'Please add a message', minLength: { value: 5, message: 'At least 5 characters' } })} />
        </form>
      )}
    </Modal>
  );
}
