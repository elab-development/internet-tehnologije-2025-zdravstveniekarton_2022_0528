import type { NextRequest } from 'next/server';
import { isValidOrigin } from '@/lib/security/csrf';

/**
 * Testovi CSRF zastite.
 *
 * isValidOrigin cita samo metodu i dva zaglavlja, pa se umesto pravog
 * NextRequest objekta pravi minimalan lazni zahtev sa tim poljima. Tako se
 * funkcija testira bez podizanja servera.
 */
function fakeRequest(
  method: string,
  origin: string | null,
  host: string | null = 'localhost:3000',
) {
  const headers = new Headers();
  if (origin !== null) headers.set('origin', origin);
  if (host !== null) headers.set('host', host);

  return { method, headers } as unknown as NextRequest;
}

describe('isValidOrigin (CSRF zastita)', () => {
  it('propusta GET zahtev bez obzira na Origin', () => {
    // GET ne menja podatke, pa nije meta CSRF napada.
    expect(isValidOrigin(fakeRequest('GET', 'https://napadac.rs'))).toBe(true);
  });

  it('propusta POST sa nase adrese', () => {
    expect(isValidOrigin(fakeRequest('POST', 'http://localhost:3000'))).toBe(true);
  });

  it('ODBIJA POST sa tudje adrese', () => {
    expect(isValidOrigin(fakeRequest('POST', 'https://napadac.rs'))).toBe(false);
  });

  it('ODBIJA PUT sa tudje adrese', () => {
    expect(isValidOrigin(fakeRequest('PUT', 'https://napadac.rs'))).toBe(false);
  });

  it('ODBIJA DELETE sa tudje adrese', () => {
    expect(isValidOrigin(fakeRequest('DELETE', 'https://napadac.rs'))).toBe(false);
  });

  it('ODBIJA PATCH sa tudje adrese', () => {
    expect(isValidOrigin(fakeRequest('PATCH', 'https://napadac.rs'))).toBe(false);
  });

  it('ODBIJA adresu koja samo lici na nasu', () => {
    // "localhost:3000.napadac.rs" nije isto sto i "localhost:3000".
    expect(isValidOrigin(fakeRequest('POST', 'https://localhost:3000.napadac.rs'))).toBe(false);
  });

  it('ODBIJA istu adresu na drugom portu', () => {
    expect(isValidOrigin(fakeRequest('POST', 'http://localhost:4000'))).toBe(false);
  });

  it('propusta zahtev bez Origin zaglavlja (Postman, curl, testovi)', () => {
    // CSRF napad po definiciji ide kroz tudji browser, a browser uvek salje
    // Origin. Alat koji ga ne salje ionako nema zrtvin kolacic.
    expect(isValidOrigin(fakeRequest('POST', null))).toBe(true);
  });

  it('ODBIJA zahtev sa neispravnim Origin zaglavljem', () => {
    expect(isValidOrigin(fakeRequest('POST', 'ovo-nije-adresa'))).toBe(false);
  });

  it('ODBIJA zahtev bez Host zaglavlja', () => {
    expect(isValidOrigin(fakeRequest('POST', 'http://localhost:3000', null))).toBe(false);
  });

  it('radi i za produkcijski domen', () => {
    const request = fakeRequest('POST', 'https://ekarton.vercel.app', 'ekarton.vercel.app');
    expect(isValidOrigin(request)).toBe(true);
  });
});
