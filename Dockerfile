# Multi-stage build: aplikacija se gradi u jednoj fazi, a u finalnu sliku
# ulazi samo ono sto je potrebno za pokretanje. Time je slika znatno manja
# i ne sadrzi izvorni kod ni alate za razvoj.

# ---------- Faza 1: zavisnosti ----------
FROM node:20-alpine AS deps
WORKDIR /app

# Alpine je namerno minimalna distribucija i ne dolazi sa openssl bibliotekom,
# koju Prisma engine zahteva. libc6-compat resava razlike izmedju musl i glibc.
RUN apk add --no-cache openssl libc6-compat

# Kopiraju se samo fajlovi sa spiskom paketa. Dokle god se oni ne menjaju,
# Docker ponovo koristi kesirani sloj i ne instalira pakete iznova.
COPY package.json package-lock.json ./
COPY prisma ./prisma

# npm ci instalira tacno verzije iz package-lock.json - isti rezultat svaki put.
RUN npm ci

# ---------- Faza 2: build ----------
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Vrednosti su lazne i sluze samo da build prodje; prave vrednosti dolaze
# iz okruzenja pri pokretanju kontejnera. Prisma pri "generate" ne otvara
# konekciju ka bazi, pa ovde nije potrebna prava adresa.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV NEXTAUTH_SECRET="build-time-placeholder"
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---------- Faza 3: pokretanje ----------
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Aplikacija se pokrece kao obican korisnik, a ne kao root. Ako neko probije
# aplikaciju, nema administratorska prava unutar kontejnera.
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Zahvaljujuci output: 'standalone' u next.config.js, Next.js sam pripremi
# minimalan server sa samo onim paketima koje aplikacija stvarno koristi.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma CLI i migracije su potrebni da bi se pri pokretanju primenile
# migracije na bazu (vidi docker-compose.yml).
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js je fajl koji Next.js generise u standalone build-u.
CMD ["node", "server.js"]
