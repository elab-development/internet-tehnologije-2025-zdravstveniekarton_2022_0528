# Zdravstveni e-Karton

Veb aplikacija za vođenje elektronskog zdravstvenog kartona pacijenata.

Seminarski rad iz predmeta **Internet tehnologije** — Fakultet organizacionih nauka.

---

## Sadržaj

- [O aplikaciji](#o-aplikaciji)
- [Korisničke uloge](#korisničke-uloge)
- [Tehnologije](#tehnologije)
- [Brzo pokretanje](#brzo-pokretanje)
- [Demo nalozi](#demo-nalozi)
- [Sve komande](#sve-komande)
- [Struktura projekta](#struktura-projekta)
- [Model podataka](#model-podataka)
- [API dokumentacija](#api-dokumentacija)
- [Eksterni API-ji](#eksterni-api-ji)
- [Bezbednost](#bezbednost)
- [Testiranje](#testiranje)
- [CI/CD](#cicd)
- [Git grane](#git-grane)

---

## O aplikaciji

Aplikacija digitalizuje zdravstveni karton pacijenta. Umesto papirne dokumentacije, istorija
pregleda, postavljene dijagnoze, propisana terapija, laboratorijski nalazi i evidentirane alergije
čuvaju se na jednom mestu i dostupni su isključivo osobama koje na njih imaju pravo.

**Osnovni tok kroz sistem:**

```
Pacijent                Sestra              Doktor                  Sestra
   │                      │                    │                       │
   ├─ traži termin ──────►│                    │                       │
   │                      ├─ potvrđuje ───────►│                       │
   │                      │                    ├─ unosi pregled        │
   │                      │                    │  (ICD-10 dijagnoza)   │
   │                      │                    ├─ propisuje recept     │
   │                      │                    │  (openFDA info)       │
   │                      │                    ├─ naručuje nalaz ─────►│
   │                      │                    │                       ├─ unosi rezultat
   │◄─────────── sve vidi u svom kartonu ──────────────────────────────┘
```

Pošto je reč o osetljivim zdravstvenim podacima, akcenat je stavljen na **autorizaciju po ulogama**
i **zaštitu od IDOR napada** — pacijent ni na koji način ne može doći do tuđeg kartona.

> **Napomena:** aplikacija je studentski projekat namenjen demonstraciji veb tehnologija. Nije
> medicinski sertifikovana i ne sme se koristiti za stvarne kliničke odluke.

---

## Korisničke uloge

| Uloga             | Ko je               | Šta može                                                                          | Šta ne može                                               |
| ----------------- | ------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Pacijent**      | vlasnik kartona     | vidi svoju istoriju, recepte i nalaze; traži termin; otkazuje svoj termin         | ništa tuđe; ne potvrđuje termine; ne menja svoje alergije |
| **Sestra**        | medicinski tehničar | potvrđuje i otkazuje termine, unosi rezultate nalaza i alergije                   | ne postavlja dijagnozu ni terapiju                        |
| **Doktor**        | lekar               | kreira preglede i dijagnoze, propisuje recepte, naručuje nalaze, vidi sve kartone | ne menja tuđe preglede; nema admin funkcije               |
| **Administrator** | IT osoblje ustanove | kreira naloge osoblja, deaktivira naloge, prati statistiku                        | ne „leči“ — ne unosi dijagnoze ni rezultate               |

Samo se **pacijent registruje samostalno**. Naloge doktora i sestara otvara administrator, kao i u
stvarnom zdravstvenom sistemu.

---

## Tehnologije

| Sloj              | Tehnologija                                                          |
| ----------------- | -------------------------------------------------------------------- |
| Framework         | Next.js 14 (App Router), React 18, TypeScript                        |
| Stilizovanje      | Tailwind CSS                                                         |
| Baza podataka     | PostgreSQL 16                                                        |
| ORM i migracije   | Prisma                                                               |
| Autentifikacija   | NextAuth.js (Credentials provider, JWT u httpOnly kolačiću) + bcrypt |
| Validacija        | Zod                                                                  |
| Grafikoni         | Chart.js                                                             |
| Testiranje        | Jest + React Testing Library                                         |
| API dokumentacija | OpenAPI 3.0.3 + Swagger UI                                           |
| Kontejnerizacija  | Docker + Docker Compose                                              |
| CI/CD             | GitHub Actions                                                       |
| Hosting           | Vercel (aplikacija i baza)                                           |

---

## Brzo pokretanje

### Preduslovi

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/) 18+
- [Git](https://git-scm.com/)

### Priprema

```bash
git clone https://github.com/elab-development/internet-tehnologije-2025-zdravstveniekarton_2022_0528.git
```

```bash
cd internet-tehnologije-2025-zdravstveniekarton_2022_0528
```

```bash
cp .env.example .env
```

U `.env` postaviti `NEXTAUTH_SECRET` na nasumičnu vrednost. Ključ se generiše komandom:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

### Varijanta A: Docker (preporučeno)

Pokreće i bazu i aplikaciju jednom komandom.

```bash
docker compose up --build
```

Aplikacija je dostupna na **http://localhost:3000**. Migracije se primenjuju automatski pri
pokretanju.

Punjenje demo podacima (u drugom terminalu):

```bash
npm install
```

```bash
npm run db:seed
```

Gašenje:

```bash
docker compose down
```

---

### Varijanta B: lokalno

Baza u Dockeru, aplikacija na host mašini — pogodno za razvoj.

```bash
npm install
```

```bash
npm run db:up
```

```bash
npx prisma migrate deploy
```

```bash
npm run db:seed
```

```bash
npm run dev
```

> **Napomena o portu:** baza je izložena na portu **5433**, a ne 5432, da ne bi došlo do sudara sa
> lokalno instaliranim PostgreSQL-om. Unutar Docker mreže aplikacija koristi `db:5432`.

---

## Demo nalozi

Dostupni nakon `npm run db:seed`. Lozinka za sve naloge je **`lozinka123`**.

| Email                  | Uloga                   | Za šta je koristan                                            |
| ---------------------- | ----------------------- | ------------------------------------------------------------- |
| `admin@ekarton.rs`     | Administrator           | admin panel, statistika cele ustanove                         |
| `jovanovic@ekarton.rs` | Doktor (opšta medicina) | unos pregleda, recepti, naručivanje nalaza                    |
| `petrovic@ekarton.rs`  | Doktor (kardiologija)   | provera da doktor ne vidi tuđe termine                        |
| `sestra@ekarton.rs`    | Medicinska sestra       | potvrda termina, unos rezultata nalaza                        |
| `marko@primer.rs`      | Pacijent                | ima pregled, recepte, nalaz i **tešku alergiju na penicilin** |
| `ana@primer.rs`        | Pacijent                | provera IDOR zaštite između dva pacijenta                     |

---

## Sve komande

| Komanda                             | Opis                                            |
| ----------------------------------- | ----------------------------------------------- |
| `npm run dev`                       | razvojni server                                 |
| `npm run build`                     | produkcioni build (uključuje `prisma generate`) |
| `npm run start`                     | pokretanje produkcionog builda                  |
| `npm test`                          | automatizovani testovi                          |
| `npm run test:coverage`             | testovi sa izveštajem o pokrivenosti            |
| `npm run lint`                      | provera koda ESLint-om                          |
| `npm run type-check`                | provera TypeScript tipova                       |
| `npm run format`                    | formatiranje koda Prettier-om                   |
| `npm run format:check`              | provera formatiranja (koristi je CI)            |
| `npm run db:up` / `npm run db:down` | pokretanje i gašenje baze u Dockeru             |
| `npm run db:seed`                   | punjenje baze demo podacima                     |

> **Napomena za instalaciju novih paketa (Windows):** `npm install` na Windows-u u
> `package-lock.json` upisuje samo Windows varijante opcionih paketa, pa `npm ci` na Linux-u
> (GitHub Actions, Docker) puca uz poruku `Missing: ... from lock file`. Posle svakog dodavanja
> paketa pokrenuti:
>
> ```bash
> npm run lock:fix
> ```
>
> Ta komanda regeneriše lock fajl unutar Linux kontejnera, pa on sadrži varijante za sve
> platforme i radi svuda.

---

## Struktura projekta

```
├── app/
│   ├── (auth)/login, (auth)/register    prijava i registracija
│   ├── dashboard/                       početna po ulozi (serverska komponenta)
│   ├── appointments/                    termini
│   ├── patients/                        pacijenti i kartoni
│   ├── medical-records/                 pregledi i terapija
│   ├── lab-results/                     laboratorijski nalazi
│   ├── admin/                           upravljanje nalozima
│   ├── stats/                           grafikoni
│   ├── api-docs/                        Swagger UI
│   └── api/                             REST API rute
├── components/
│   ├── ui/                              Button, Input, Select, Card, Modal
│   ├── appointments/, medical/          komponente po domenu
│   └── charts/, dashboard/, layout/
├── lib/
│   ├── prisma.ts, auth.ts, session.ts   baza i autentifikacija
│   ├── validation/schemas.ts            Zod šeme (sa XSS sanitizacijom)
│   ├── security/                        idor, csrf, sanitize, rateLimiter
│   └── external/                        icd10, drugInfo
├── prisma/
│   ├── schema.prisma                    8 modela
│   ├── migrations/                      6 migracija
│   └── seed.ts                          demo podaci
├── __tests__/                           134 testa
├── public/swagger.json                  OpenAPI specifikacija
├── middleware.ts                        RBAC + CSRF
├── Dockerfile, docker-compose.yml
└── .github/workflows/ci.yml
```

---

## Model podataka

Osam međusobno povezanih modela:

```
User ──1:1── PatientProfile ──1:N── MedicalRecord ──1:N── Prescription
 │                  │                      │
 │                  ├──1:N── LabResult      └── veza ka doktoru (User)
 │                  └──1:N── Allergy
 ├──1:1── DoctorProfile
 ├──1:N── Appointment (kao pacijent)
 └──1:N── Appointment (kao doktor)

Appointment ──1:1 (opciono)── MedicalRecord
```

**Migracije** (`prisma/migrations/`) obuhvataju tri različita tipa:

| Migracija                              | Tip                                   |
| -------------------------------------- | ------------------------------------- |
| `init`                                 | kreiranje tabele i enum tipa          |
| `add_patient_and_doctor_profiles`      | nove tabele + strani ključevi         |
| `add_clinical_models`                  | 5 tabela + 10 stranih ključeva        |
| `add_diagnosis_code_to_medical_record` | **dodavanje kolone**                  |
| `add_is_active_to_user`                | **dodavanje kolone**                  |
| `add_constraints_and_indexes`          | **jedinstvena ograničenja i indeksi** |

---

## API dokumentacija

Specifikacija je pisana po **OpenAPI 3.0.3** standardu (`public/swagger.json`), a interaktivni
prikaz je na **[/api-docs](http://localhost:3000/api-docs)**.

Dokumentovano je **20 ruta sa 28 operacija** u 11 grupa. Za svaku rutu opisani su ulazni podaci,
oblik odgovora, ko sme da je pozove i svi HTTP statusi (`200`, `201`, `400`, `401`, `403`, `404`,
`409`, `429`).

Svi odgovori su u JSON formatu:

```jsonc
{ "data": ... }                                // uspeh
{ "error": "Nemate ovlascenje za ovu akciju" } // greška
{ "error": "Podaci nisu ispravni", "fields": { "jmbg": "..." } } // greška validacije
```

---

## Eksterni API-ji

Oba su besplatna, ne traže API ključ i pozivaju se **isključivo kroz sopstvene proxy rute**
(`/api/external/*`) — tako ostaju zaštićene ulogom i nema CORS problema.

| API                           | Izvor                        | Gde se koristi                                                       |
| ----------------------------- | ---------------------------- | -------------------------------------------------------------------- |
| **ICD-10-CM Clinical Tables** | National Library of Medicine | pretraga zvaničnih šifara dijagnoza pri unosu pregleda               |
| **openFDA Drug Label**        | FDA (SAD)                    | informacije o leku (indikacije, upozorenja) pri propisivanju recepta |

Oba služe **kao pomoć pri unosu, a ne kao izvor istine** za medicinske odluke. Ako lek nije u FDA
bazi — a mnogi sa našeg tržišta nisu, npr. _paracetamol_ — prikazuje se poruka, ali se unos recepta
ne blokira.

---

## Bezbednost

| Napad             | Zaštita                                                        | Gde                           |
| ----------------- | -------------------------------------------------------------- | ----------------------------- |
| **IDOR**          | provera vlasništva nad konkretnim zapisom pre svakog pristupa  | `lib/security/idor.ts`        |
| **XSS**           | čišćenje HTML-a iz svakog tekstualnog unosa pre upisa u bazu   | `lib/security/sanitize.ts`    |
| **CSRF**          | provera `Origin` zaglavlja za sve zahteve koji menjaju podatke | `lib/security/csrf.ts`        |
| **SQL Injection** | Prisma parametrizuje svaki upit; nema sirovog SQL-a            | `lib/prisma.ts`               |
| **Brute-force**   | 5 pokušaja prijave / 15 min, 3 registracije / sat              | `lib/security/rateLimiter.ts` |

Dodatno:

- lozinke se čuvaju kao **bcrypt heš**, nikad kao tekst, i `passwordHash` se **nikada** ne vraća
  kroz API
- sesija je **JWT u httpOnly kolačiću** — JavaScript ne može da je pročita
- prijava ne razlikuje „nepostojeći email“ od „pogrešna lozinka“ (sprečava mapiranje naloga)
- zaštita postoji u **dva sloja**: `middleware.ts` štiti stranice po ulozi, a svaka API ruta ponovo
  proverava pozivaoca — jer se API može pozvati i direktno, van aplikacije

---

## Testiranje

```bash
npm test
```

**134 testa** u četiri grupe:

| Grupa                | Šta pokriva                                                  |
| -------------------- | ------------------------------------------------------------ |
| `validation.test.ts` | sve Zod šeme — ispravni i neispravni unosi                   |
| `security.test.ts`   | XSS sanitizacija, IDOR pravila, RBAC rute                    |
| `csrf.test.ts`       | provera `Origin` zaglavlja                                   |
| `ui.test.tsx`        | `Button`, `Input`, `Select`, `Card`, `Modal`, oznake statusa |

Najvredniji su **autorizacioni testovi**, koji doslovno tvrde stvari poput „pacijent ne može da
pročita tuđi termin“ ili „sestra ne sme da menja dijagnozu“.

---

## CI/CD

Pipeline (`.github/workflows/ci.yml`) pokreće se pri svakom `push`-u i `pull request`-u ka granama
`main` i `develop`:

| Posao    | Šta radi                                                  |
| -------- | --------------------------------------------------------- |
| `lint`   | ESLint + provera TypeScript tipova + provera formatiranja |
| `test`   | testovi sa izveštajem o pokrivenosti koda                 |
| `build`  | produkcioni `next build`                                  |
| `docker` | provera da se Docker slika uspešno gradi                  |

Poslovi `build` i `docker` pokreću se tek kada `lint` i `test` prođu.

---

## Git grane

| Grana       | Namena                                   |
| ----------- | ---------------------------------------- |
| `main`      | stabilna produkciona verzija             |
| `develop`   | integraciona grana                       |
| `feature/*` | 11 grana, po jedna za svaku fazu razvoja |

Feature grane se u `develop` spajaju sa `--no-ff`, tako da svaki spoj ostaje vidljiv kao zaseban
merge commit. Grane se **ne brišu** posle spajanja, da istorija razvoja ostane pregledna.

---

## Autori

Seminarski rad — Internet tehnologije, Fakultet organizacionih nauka.
