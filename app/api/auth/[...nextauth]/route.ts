import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// NextAuth sam obradjuje sve /api/auth/* rute (signin, signout, session, csrf...).
// Handler se izvozi i za GET i za POST jer se te rute pozivaju na oba nacina.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
