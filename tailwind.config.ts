import type { Config } from 'tailwindcss';

/**
 * Tema aplikacije - "klinicka" paleta boja.
 *
 * Umesto da se kroz kod koriste konkretne boje (sky-700, red-600...), definisu se
 * imena po znacenju: primary za glavnu akciju, danger za brisanje, success za
 * zavrsen nalaz. Tako se izgled cele aplikacije menja izmenom ovog jednog fajla,
 * a iz koda se odmah cita SVRHA boje, a ne njena nijansa.
 *
 * Izbor boja: umirujuca medicinska plava kao glavna, zelena za zavrsene stavke,
 * amber za upozorenja (alergije), crvena samo za opasne akcije. Pozadina je
 * svetlosiva da beli okviri kartica jasno iskacu - vazno za citljivost podataka.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Glavna boja aplikacije - medicinska plava.
        primary: {
          50: '#f0f7fb',
          100: '#dcebf5',
          200: '#bcd9ec',
          300: '#8fbfdd',
          400: '#5b9dc9',
          500: '#3880b1',
          600: '#286895',
          700: '#215479', // osnovna nijansa za dugmad i naslove
          800: '#1f4764',
          900: '#1d3d54',
        },
        // Zelena - zavrsene stavke (obavljen pregled, gotov nalaz).
        success: {
          50: '#f0f9f4',
          100: '#dbf0e3',
          600: '#2f855a',
          700: '#276749',
        },
        // Amber - upozorenja, najpre alergije pacijenta.
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          600: '#b45309',
          700: '#92400e',
        },
        // Crvena - iskljucivo opasne akcije (otkazivanje, deaktivacija naloga).
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
      },
    },
  },
  plugins: [],
};

export default config;
