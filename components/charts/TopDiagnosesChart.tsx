'use client';

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

/**
 * Prstenasti grafik: najcesce dijagnoze.
 *
 * Prstenasti tip je izabran jer pokazuje UDEO svake dijagnoze u ukupnom broju
 * pregleda, sto je ovde zanimljivije od apsolutnih brojeva.
 */
ChartJS.register(ArcElement, Tooltip, Legend);

// Nijanse iz palete aplikacije, poredjane tako da susedni segmenti budu jasno
// razlicitog tona - inace se na prstenu tesko razlikuju.
const SEGMENT_COLORS = [
  '#215479',
  '#3880b1',
  '#8fbfdd',
  '#2f855a',
  '#b45309',
  '#5b9dc9',
  '#bcd9ec',
];

type Props = {
  data: { name: string; count: number }[];
};

export default function TopDiagnosesChart({ data }: Props) {
  const chartData = {
    labels: data.map((item) => item.name),
    datasets: [
      {
        data: data.map((item) => item.count),
        backgroundColor: SEGMENT_COLORS,
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  return (
    <Doughnut
      data={chartData}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, font: { size: 11 } },
          },
          tooltip: {
            callbacks: {
              // Uz broj pregleda prikazuje se i procenat, jer je udeo ono
              // sto ovaj grafik zapravo prikazuje.
              label: (context) => {
                const total = context.dataset.data.reduce(
                  (sum: number, value) => sum + Number(value),
                  0,
                );
                const value = Number(context.parsed);
                const percent = total > 0 ? Math.round((value / total) * 100) : 0;
                return ` ${value} pregleda (${percent}%)`;
              },
            },
          },
        },
      }}
    />
  );
}
