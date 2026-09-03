/**
 * Regenerisanje package-lock.json datoteke tako da vazi za SVE platforme.
 * Pokretanje:  npm run lock:fix   (potreban je pokrenut Docker)
 *
 * ZASTO OVO POSTOJI
 * Neki paketi imaju "opcione" zavisnosti koje se razlikuju po operativnom
 * sistemu - npr. esbuild ima poseban binarni fajl za Windows, jedan za Linux i
 * jedan za macOS. U package-lock.json datoteci moraju da stoje SVI, jer se
 * projekat razvija na Windows-u, a gradi se u Linux kontejneru (Docker) i na
 * CI serveru.
 *
 * Problem je u tome sto npm pri obicnom `npm install` zapise uglavnom ono sto
 * vazi za masinu na kojoj je pokrenut. Lock nastao na Windows-u tako ostane bez
 * paketa koji trebaju Linux-u, pa `npm ci` u Docker-u pukne porukom:
 *
 *   npm error `npm ci` can only install packages when your package.json and
 *   package-lock.json are in sync. Missing: @emnapi/core@... from lock file
 *
 * Lock napravljen samo u Linux kontejneru ima obrnut problem - ostane bez
 * Windows paketa, pa onda lokalno pokretanje pukne na isti nacin.
 *
 * RESENJE
 * Lock se dopunjuje u Linux kontejneru, ali novijim npm-om (verzija 11), koji
 * ume da izracuna kompletno stablo zavisnosti i pri tome ne brise unose za
 * druge platforme. Postojeci lock se NE brise - on je polazna tacka, pa se
 * dobija unija Windows i Linux paketa.
 *
 * Zato se ovde poziva Docker: nije potrebno instalirati drugi Node na racunar.
 */
const { spawnSync } = require('child_process');

// process.cwd() radi isto i u PowerShell-u i u Git Bash-u, za razliku od
// promenljivih $PWD (Bash) i %cd% (cmd), koje vaze samo u svojoj ljusci.
const projectDir = process.cwd();

console.log('Dopunjavanje package-lock.json datoteke u Linux kontejneru...\n');

const result = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '-v',
    `${projectDir}:/app`,
    '-w',
    '/app',
    'node:20-alpine',
    'sh',
    '-c',
    'npm i -g npm@11 --silent && npm install --package-lock-only --no-audit --no-fund',
  ],
  { stdio: 'inherit', shell: false },
);

if (result.error) {
  console.error('\nDocker nije dostupan. Pokrenite Docker Desktop pa probajte ponovo.');
  process.exit(1);
}

if (result.status !== 0) {
  console.error('\nRegenerisanje nije uspelo.');
  process.exit(result.status ?? 1);
}

console.log('\nGotovo. Proverite izmene sa: git diff package-lock.json');
console.log('Posle ovoga NE pokrecite `npm install` na Windows-u - time bi lock');
console.log('ponovo ostao bez Linux paketa. Za lokalne pakete koristite `npm ci`.');
