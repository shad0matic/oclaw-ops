import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

// Fix BigInt serialization (Prisma 7 pg adapter returns bigint for bigserial)
// @ts-ignore
BigInt.prototype.toJSON = function () {
    return Number(this);
};

const prismaClientSingleton = () => {
    const adapter = new PrismaPg({
        connectionString: process.env.DATABASE_URL!,
    })
    return new PrismaClient({ adapter })
}

declare const globalThis: {
    prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma

// Raw pg pool for direct SQL (vector queries, metrics, etc.)
export const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL!,
})
