import { PrismaClient } from '@prisma/client';

// U razvoju Next.js pri svakoj izmeni koda ponovo ucitava module. Bez ovog kesiranja
// na globalnom objektu, svaki reload bi otvorio novu konekciju ka bazi i ubrzo bi se
// iscrpeo connection pool. U produkciji se klijent kreira samo jednom.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
