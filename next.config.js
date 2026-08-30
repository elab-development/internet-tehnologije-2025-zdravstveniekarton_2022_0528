/**
 * NextAuth pri ucitavanju modula racuna svoju osnovnu adresu ovako:
 *
 *   new URL(process.env.NEXTAUTH_URL ?? podrazumevanaAdresa)
 *
 * Koristi se operator `??`, koji reaguje samo na `null` i `undefined`. Prazan
 * string NIJE nijedno od toga, pa zavrsava u `new URL('')` i baca gresku
 * "TypeError: Invalid URL". Posto se to desava pri ucitavanju modula, obara
 * ceo build - svaka stranica koja (makar preko layout-a) koristi NextAuth.
 *
 * Prazna promenljiva okruzenja lako nastane na hosting platformama, gde se
 * vrednost unese kroz formu pa ostane neispunjena. Zato se ovde prazna
 * vrednost uklanja, da bi NextAuth koristio svoju podrazumevanu adresu.
 *
 * Ovo ne utice na lokalno pokretanje: u Dockeru i u razvoju NEXTAUTH_URL ima
 * pravu vrednost iz .env fajla, pa uslov ispod nije ni ispunjen.
 */
if (process.env.NEXTAUTH_URL !== undefined && process.env.NEXTAUTH_URL.trim() === '') {
  delete process.env.NEXTAUTH_URL;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // "standalone" priprema minimalan server za Docker sliku.
  // Vercel ovo podesavanje ignorise i gradi aplikaciju na svoj nacin.
  output: 'standalone',
};

module.exports = nextConfig;
