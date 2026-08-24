# Zdravstveni e-Karton

Veb aplikacija za vođenje elektronskog zdravstvenog kartona pacijenata u zdravstvenoj ustanovi.

Seminarski rad iz predmeta **Internet tehnologije** — Fakultet organizacionih nauka, Univerzitet u Beogradu.

---

## Sadržaj

- [O aplikaciji](#o-aplikaciji)
- [Korisničke uloge](#korisničke-uloge)
- [Tehnologije](#tehnologije)
- [Eksterni API-ji](#eksterni-api-ji)
- [Pokretanje aplikacije](#pokretanje-aplikacije)
- [Struktura projekta](#struktura-projekta)
- [Git grane](#git-grane)
- [Plan razvoja](#plan-razvoja)

---

## O aplikaciji

Aplikacija digitalizuje zdravstveni karton pacijenta. Umesto papirne dokumentacije, svi podaci o
pacijentu — istorija pregleda, postavljene dijagnoze, propisana terapija, laboratorijski nalazi i
evidentirane alergije — čuvaju se na jednom mestu i dostupni su isključivo osobama koje na njih
imaju pravo.

Osnovni tok kroz aplikaciju:

1. Pacijent se registruje i traži termin kod izabranog doktora.
2. Medicinska sestra potvrđuje ili otkazuje termin.
3. Doktor obavlja pregled i unosi ga u karton — simptome, dijagnozu (uz pretragu zvanične ICD-10
   šifre) i terapiju.
4. Doktor propisuje recept i po potrebi naručuje laboratorijski nalaz.
5. Sestra unosi rezultat nalaza.
6. Pacijent u svom kartonu vidi celokupnu hronološku istoriju — preglede, recepte i nalaze.

Pošto je reč o osetljivim zdravstvenim podacima, poseban akcenat u implementaciji stavljen je na
**autorizaciju po ulogama** i **zaštitu od IDOR napada** — pacijent ni na koji način ne može doći do
tuđeg kartona.

> Napomena: aplikacija je studentski projekat namenjen demonstraciji veb tehnologija. Nije
> medicinski sertifikovana i ne sme se koristiti za stvarne kliničke odluke.

---

## Korisničke uloge

| Uloga             | Ko je                        | Šta može                                                                                     |
| ----------------- | ---------------------------- | -------------------------------------------------------------------------------------------- |
| **Pacijent**      | vlasnik sopstvenog kartona   | pregleda svoju istoriju bolesti, recepte, nalaze i alergije; traži termin                    |
| **Sestra**        | medicinska sestra / tehničar | potvrđuje i otkazuje termine, unosi laboratorijske nalaze i alergije                         |
| **Doktor**        | lekar                        | pregleda kartone pacijenata, kreira preglede i dijagnoze, propisuje recepte, naručuje nalaze |
| **Administrator** | IT osoblje ustanove          | kreira naloge doktora i sestara, aktivira/deaktivira naloge, prati statistiku sistema        |

Samo se **pacijent registruje samostalno**. Naloge doktora i sestara kreira administrator, kao i u
stvarnom zdravstvenom sistemu.

---

## Tehnologije

| Sloj              | Tehnologija                                      |
| ----------------- | ------------------------------------------------ |
| Framework         | Next.js 14 (App Router), React 18, TypeScript    |
| Stilizovanje      | Tailwind CSS                                     |
| Baza podataka     | PostgreSQL                                       |
| ORM i migracije   | Prisma                                           |
| Autentifikacija   | NextAuth.js (Credentials provider, JWT) + bcrypt |
| Validacija        | Zod                                              |
| Grafikoni         | Chart.js                                         |
| Testiranje        | Jest + React Testing Library                     |
| API dokumentacija | OpenAPI 3.0 (Swagger UI)                         |
| Kontejnerizacija  | Docker + Docker Compose                          |
| CI/CD             | GitHub Actions                                   |
| Hosting           | Vercel (aplikacija i PostgreSQL baza)            |

---

## Eksterni API-ji

Aplikacija koristi dva besplatna javna API-ja, oba kroz sopstvene proxy rute (`/api/external/*`):

1. **ICD-10-CM Clinical Table Search Service** (National Library of Medicine) — pretraga zvaničnih
   šifara dijagnoza dok doktor unosi pregled.
2. **openFDA Drug Label API** — prikaz osnovnih informacija o leku (indikacije, upozorenja) dok
   doktor propisuje recept.

Oba API-ja služe **isključivo kao pomoć pri unosu podataka**, a ne kao izvor istine za medicinske
odluke.

---

## Pokretanje aplikacije

### Preduslovi

- [Node.js](https://nodejs.org/) 18 ili noviji
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (za pokretanje baze)
- [Git](https://git-scm.com/)

### 1. Kloniranje i instalacija

```bash
git clone https://github.com/elab-development/internet-tehnologije-2025-zdravstveniekarton_2022_0528.git
```

```bash
cd internet-tehnologije-2025-zdravstveniekarton_2022_0528
```

```bash
npm install
```

### 2. Podešavanje okruženja

Kopirati `.env.example` u `.env` i popuniti vrednosti:

```bash
cp .env.example .env
```

### 3. Pokretanje razvojnog servera

```bash
npm run dev
```

Aplikacija je dostupna na [http://localhost:3000](http://localhost:3000).

### Korisne komande

| Komanda              | Opis                           |
| -------------------- | ------------------------------ |
| `npm run dev`        | razvojni server                |
| `npm run build`      | produkcioni build              |
| `npm run start`      | pokretanje produkcionog builda |
| `npm run lint`       | provera koda ESLint-om         |
| `npm run type-check` | provera TypeScript tipova      |
| `npm run format`     | formatiranje koda Prettier-om  |

---

## Struktura projekta

```
├── app/            stranice i API rute (Next.js App Router)
├── components/     React komponente (ui/, layout/, charts/, ...)
├── lib/            pomoćni kod — Prisma klijent, auth, validacija, bezbednost
├── prisma/         šema baze, migracije i seed podaci
├── __tests__/      automatizovani testovi
├── docs/           projektna dokumentacija
└── public/         statički fajlovi i Swagger specifikacija
```

---

## Git grane

| Grana       | Namena                       |
| ----------- | ---------------------------- |
| `main`      | stabilna produkciona verzija |
| `develop`   | integraciona grana           |
| `feature/*` | pojedinačne funkcionalnosti  |

Feature grane se u `develop` spajaju sa `--no-ff`, tako da svaki spoj ostaje vidljiv kao zaseban
merge commit u istoriji.

---

## Plan razvoja

- [x] Faza 0 — inicijalizacija projekta
- [ ] Faza 1 — baza podataka, modeli i migracije
- [ ] Faza 2 — autentifikacija i autorizacija
- [ ] Faza 3 — reusable UI komponente
- [ ] Faza 4 — zakazivanje i upravljanje terminima
- [ ] Faza 5 — karton pacijenta i medicinski pregledi
- [ ] Faza 6 — recepti i laboratorijski nalazi
- [ ] Faza 7 — alergije i dashboard
- [ ] Faza 8 — administratorski panel
- [ ] Faza 9 — statistika i grafikoni
- [ ] Faza 10 — bezbednost (XSS, CSRF, IDOR, rate limiting)
- [ ] Faza 11 — automatizovani testovi
- [ ] Faza 12 — Docker, Swagger i CI/CD
- [ ] Faza 13 — finalna dokumentacija

---

## Autori

Seminarski rad — Internet tehnologije, FON.
Mentor: Tamara Naumović.
