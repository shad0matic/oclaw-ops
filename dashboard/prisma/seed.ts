
import { PrismaClient } from '@/generated/prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.agent_profiles.createMany({
    data: [
      { agent_id: 'kevin', name: 'Kevin', level: 10, trust_score: 0.9 },
      { agent_id: 'dr-nefario', name: 'Dr. Nefario', level: 9, trust_score: 0.8 },
      { agent_id: 'bob', name: 'Bob', level: 1, trust_score: 0.5 },
    ],
    skipDuplicates: true,
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
