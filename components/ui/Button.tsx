import type { ButtonHTMLAttributes } from 'react';

/**
 * Reusable dugme koje se koristi kroz celu aplikaciju.
 *
 * Umesto da se Tailwind klase prepisuju na svakom dugmetu, ovde se biraju
 * preko propa variant (izgled) i size (velicina). Tako sva dugmad u aplikaciji
 * izgledaju isto, a izmena stila se radi na jednom mestu.
 */

type Variant = 'primary' | 'secondary' | 'danger';
type Size = 'sm' | 'md';

// Nasledjuju se svi standardni atributi dugmeta (onClick, disabled, type...),
// pa se komponenta koristi isto kao obicno <button>.
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
};

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-primary-700 text-white hover:bg-primary-800',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  danger: 'bg-danger-600 text-white hover:bg-danger-700',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      // Dok traje slanje dugme je onemoguceno, da korisnik ne posalje isti zahtev dva puta.
      disabled={disabled || isLoading}
      className={`rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {isLoading ? 'Sacekajte...' : children}
    </button>
  );
}
