/**
 * Zvanicni tipovi za swagger-ui-dist opisuju glavni ulaz paketa, ali ne i
 * pojedinacne bundle fajlove. Posto se ES bundle uvozi direktno (radi
 * dinamickog ucitavanja), ovde mu se dodaje deklaracija tipa.
 */
declare module 'swagger-ui-dist/swagger-ui-es-bundle.js' {
  import type { SwaggerUIOptions } from 'swagger-ui-dist';

  const SwaggerUIBundle: (options: SwaggerUIOptions) => unknown;
  export default SwaggerUIBundle;
}
