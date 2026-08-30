import Link from 'next/link';

/**
 * Plocica sa jednim brojem - osnovni gradivni element dashboard-a.
 *
 * Ako je prosledjen href, cela plocica je klikabilna i vodi na odgovarajucu
 * stranicu, da korisnik sa pocetnog ekrana odmah moze da nastavi rad.
 */
type Props = {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
  /** Isticanje brojke koja trazi paznju (npr. zahtevi koji cekaju potvrdu). */
  highlight?: boolean;
};

export default function StatTile({ label, value, hint, href, highlight = false }: Props) {
  const content = (
    <div
      className={`rounded-lg border bg-white p-4 ${
        highlight ? 'border-warning-100' : 'border-slate-200'
      } ${href ? 'transition-colors hover:border-primary-300' : ''}`}
    >
      <p className="text-sm text-slate-500">{label}</p>
      <p
        className={`mt-1 text-3xl font-bold ${highlight ? 'text-warning-700' : 'text-primary-800'}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
