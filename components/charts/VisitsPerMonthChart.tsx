'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

/**
 * Stubicasti grafik: broj pregleda po mesecima u poslednjih godinu dana.
 *
 * Chart.js je modularan - svaki tip grafika trazi da se unapred registruju
 * delovi koje koristi. Bez register poziva grafik se ne iscrtava, a greska
 * u konzoli ume da bude nejasna.
 */
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type Props = {
  data: { label: string; count: number }[];
};

export default function VisitsPerMonthChart({ data }: Props) {
  const chartData = {
    labels: data.map((item) => item.label),
    datasets: [
      {
        label: 'Broj pregleda',
        data: data.map((item) => item.count),
        backgroundColor: '#286895', // primary-600 iz teme aplikacije
        borderRadius: 4,
      },
    ],
  };

  return (
    <Bar
      data={chartData}
      options={{
        responsive: true,
        // Bez ovoga grafik zadrzava fiksni odnos stranica i ne prati sirinu kartice.
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            // Broj pregleda je ceo broj, pa se decimale na osi ne prikazuju.
            ticks: { precision: 0 },
          },
        },
      }}
    />
  );
}
