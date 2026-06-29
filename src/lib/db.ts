import { PrismaClient } from '@prisma/client'

// Supabase connection string — hardcoded fallback if .env parsing fails
const SUPABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres.bxunjxcfjxoaolqhziox:Qaz_el%401994%21@aws-1-eu-central-1.pooler.supabase.com:5432/postgres'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error'],
    datasources: {
      db: {
        url: SUPABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
