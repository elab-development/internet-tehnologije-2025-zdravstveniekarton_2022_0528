/**
 * Formatiranje datuma za prikaz korisniku.
 *
 * Baza cuva vreme u UTC formatu (npr. 2026-10-14T07:30:00.000Z), a korisniku
 * se mora prikazati po lokalnom vremenu. Intl.DateTimeFormat to radi sam,
 * uz srpsku lokalizaciju naziva meseci.
 */

export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString('sr-RS', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('sr-RS', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
