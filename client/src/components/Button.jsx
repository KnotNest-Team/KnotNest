import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cx } from '../utils/format';

const VARIANTS = {
  primary: 'bg-maroon text-ivory hover:bg-maroon-dk shadow-sm',
  secondary: 'border border-ink/20 bg-white text-ink hover:border-maroon hover:text-maroon',
  ghost: 'text-ink-2 hover:bg-ink/5',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  gold: 'bg-gold text-white hover:bg-gold/90',
  soft: 'bg-maroon/10 text-maroon hover:bg-maroon/15',
};
const SIZES = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-sm' };

export default function Button({ variant = 'primary', size = 'md', to, href, loading, icon: Icon, className, children, ...rest }) {
  const cls = cx('inline-flex items-center justify-center gap-2 rounded-full font-sans font-medium tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50', VARIANTS[variant], SIZES[size], className);
  const content = (<>{loading ? <Loader2 size={16} className="animate-spin" /> : Icon && <Icon size={16} />}{children}</>);
  if (to) return <Link to={to} className={cls} {...rest}>{content}</Link>;
  if (href) return <a href={href} className={cls} {...rest}>{content}</a>;
  return <button className={cls} disabled={loading || rest.disabled} {...rest}>{content}</button>;
}
