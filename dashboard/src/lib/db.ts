import { PrismaClient } from '@/generated/prisma/client'
import pg from 'pg'

// Fix BigInt serialization (Prisma 7 pg adapter returns bigint for bigserial)
// @ts-ignore
BigInt.prototype.toJSON = function () {
    return Number(this);
};

let _prisma: PrismaClient | null = null

function getPrisma(): PrismaClient {
    if (_prisma) return _prisma
    
    // Lazy import to avoid Turbopack evaluation at build time
    const { PrismaPg } = require('@prisma/adapter-pg')
    const adapter = new PrismaPg({
        connectionString: process.env.DATABASE_URL!,
    })
    _prisma = new PrismaClient({ adapter })
    return _prisma
}

// Use a Proxy so `prisma.xxx` lazily initializes
const prisma = new Proxy({} as PrismaClient, {
    get(_target, prop) {
        return (getPrisma() as any)[prop]
    }
})

export default prisma

if (process.env.NODE_ENV !== 'production') {
    (globalThis as any).prismaGlobal = prisma
}

// Raw pg pool for direct SQL (vector queries, metrics, etc.)
let _pool: pg.Pool | null = null
export const pool = new Proxy({} as pg.Pool, {
    get(_target, prop) {
        if (!_pool) {
            _pool = new pg.Pool({
                connectionString: process.env.DATABASE_URL!,
            })
        }
        return (_pool as any)[prop]
    }
})
