/**
 * Prvi eksterni API: ICD-10-CM Clinical Table Search Service.
 *
 * Izvor: National Library of Medicine (SAD). Besplatan je i ne trazi API kljuc.
 * ICD-10 je medjunarodna klasifikacija bolesti - svaka dijagnoza ima svoju
 * standardnu sifru (npr. J06.9 za akutnu infekciju gornjih disajnih puteva).
 *
 * VAZNO: sluzi iskljucivo kao pomoc lekaru pri unosu, da ne kuca sifru napamet.
 * Nije izvor istine za medicinske odluke.
 */

const ICD10_URL = 'https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search';

export type Diagnosis = {
  code: string; // ICD-10 sifra, npr. "J06.9"
  name: string; // naziv dijagnoze na engleskom
};

/**
 * Odgovor ovog API-ja NIJE objekat nego niz sa fiksnim redosledom:
 *   [ukupno, [sifre], null, [[sifra, naziv], ...]]
 * Cetvrti element je ono sto nam treba, pa se tako i tipizuje.
 */
type Icd10Response = [number, string[], null, [string, string][]];

/**
 * Pretrazuje ICD-10 sifre po zadatom pojmu.
 * Vraca prazan niz ako pretraga ne uspe - greska eksternog servisa ne sme
 * da obori unos pregleda, lekar uvek moze da upise dijagnozu rucno.
 */
export async function searchDiagnoses(term: string, limit = 10): Promise<Diagnosis[]> {
  // Parametar sf govori API-ju da pretrazuje i po sifri i po nazivu.
  // Bez njega servis vraca prazan rezultat, sto je lako previdjeti.
  const url = `${ICD10_URL}?terms=${encodeURIComponent(term)}&sf=code,name&maxList=${limit}`;

  try {
    const response = await fetch(url, {
      // Rezultat za isti pojam se ne menja, pa se kesira jedan sat.
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];

    const data = (await response.json()) as Icd10Response;
    const pairs = data[3] ?? [];

    return pairs.map(([code, name]) => ({ code, name }));
  } catch {
    return [];
  }
}
