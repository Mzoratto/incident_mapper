import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const samples = [
    { title: 'Pothole on 3rd Ave', description: 'Large pothole near crosswalk', lat: 40.741, lng: -73.989 },
    { title: 'Broken streetlight', description: 'Lamp flickers at night', lat: 40.742, lng: -73.985 },
    { title: 'Icy sidewalk', description: 'Dangerous ice patch', lat: 40.739, lng: -73.986 }
  ];
  for (const s of samples) {
    await prisma.incident.create({ data: { title: s.title, description: s.description, status: 'OPEN', severity: 'LOW', lat: s.lat, lng: s.lng } });
  }
  console.log('Seeded demo incidents');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });

