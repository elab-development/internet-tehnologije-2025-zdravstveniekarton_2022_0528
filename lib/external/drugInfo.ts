/**
 * Drugi eksterni API: openFDA Drug Label.
 *
 * Izvor: americka Uprava za hranu i lekove (FDA). Besplatan je i ne trazi
 * API kljuc za osnovnu upotrebu. Vraca zvanicno uputstvo za lek - indikacije,
 * upozorenja, nacin doziranja.
 *
 * VAZNO: sluzi kao informativna pomoc lekaru pri propisivanju terapije, a ne
 * kao izvor istine za medicinske odluke. Baza je americka, pa mnogi lekovi sa
 * naseg trzista u njoj ne postoje (npr. "paracetamol" se u SAD zove
 * "acetaminophen"). Zato izostanak podatka NIKADA ne sme da blokira unos recepta.
 */

const OPENFDA_URL = 'https://api.fda.gov/drug/label.json';

export type DrugInfo = {
  brandName: string | null;
  genericName: string | null;
  indications: string | null;
  warnings: string | null;
  dosage: string | null;
};

/** Oblik odgovora koji nam je potreban; ostala polja se ignorisu. */
type OpenFdaResult = {
  openfda?: { brand_name?: string[]; generic_name?: string[] };
  indications_and_usage?: string[];
  warnings?: string[];
  dosage_and_administration?: string[];
};

/**
 * Tekstovi u FDA odgovoru umeju da budu vrlo dugacki (cele strane uputstva).
 * Za prikaz u formi dovoljan je kratak izvod, pa se tekst skracuje.
 */
function firstParagraph(values: string[] | undefined, maxLength = 400): string | null {
  const text = values?.[0]?.trim();
  if (!text) return null;
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
}

/**
 * Trazi informacije o leku po nazivu.
 * Vraca null ako lek nije pronadjen ili ako servis nije dostupan.
 */
export async function getDrugInfo(name: string): Promise<DrugInfo | null> {
  // Navodnici oko pojma znace tacan izraz, a razmak izmedju uslova znaci ILI.
  // Trazi se po zastitnom imenu, generickom nazivu i nazivu supstance, jer se
  // isti lek u bazi pojavljuje pod razlicitim imenima.
  const escaped = name.replace(/"/g, '');
  const query = `(openfda.brand_name:"${escaped}"+openfda.generic_name:"${escaped}"+openfda.substance_name:"${escaped}")`;
  const url = `${OPENFDA_URL}?search=${encodeURIComponent(query)}&limit=1`;

  try {
    const response = await fetch(url, {
      // Uputstvo za lek se retko menja, pa se odgovor kesira 24 sata.
      // To ujedno cuva i dnevni limit poziva ka besplatnom servisu.
      next: { revalidate: 86400 },
    });

    // Kada lek ne postoji, openFDA vraca status 404 sa objasnjenjem u telu.
    if (!response.ok) return null;

    const data = (await response.json()) as { results?: OpenFdaResult[] };
    const result = data.results?.[0];
    if (!result) return null;

    return {
      brandName: result.openfda?.brand_name?.[0] ?? null,
      genericName: result.openfda?.generic_name?.[0] ?? null,
      indications: firstParagraph(result.indications_and_usage),
      warnings: firstParagraph(result.warnings),
      dosage: firstParagraph(result.dosage_and_administration),
    };
  } catch {
    return null;
  }
}
