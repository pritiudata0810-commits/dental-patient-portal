const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding dental clinics...');

  const clinics = [
    {
      id: 'DEN-BLR-001',
      name: 'Apex Smile Dental Care & Implant Center',
      tagline: 'Precision Dentistry with Gentle Care',
      address: 'Suite 402, Indiranagar 100ft Road, Bengaluru, KA 560038',
      phone: '+91 98765 43210',
      email: 'care@apexsmile.in',
      operatingHours: 'Mon - Sat: 9:00 AM - 8:00 PM | Sun: 10:00 AM - 2:00 PM',
      isActive: true,
    },
    {
      id: 'DEN-MUM-002',
      name: 'Pearl White Dental Studio',
      tagline: 'Modern Cosmetic & Restorative Dentistry',
      address: 'Plot 18, Linking Road, Bandra West, Mumbai, MH 400050',
      phone: '+91 98220 12345',
      email: 'hello@pearlwhitedental.com',
      operatingHours: 'Mon - Sat: 9:30 AM - 8:30 PM',
      isActive: true,
    },
    {
      id: 'DEN-DEL-003',
      name: 'Metro Advanced Orthodontics & Dental Clinic',
      tagline: 'Creating Confident Smiles Everyday',
      address: 'B-4, South Extension Part II, New Delhi, DL 110049',
      phone: '+91 98111 98765',
      email: 'info@metrodental.org',
      operatingHours: 'Mon - Sun: 9:00 AM - 7:30 PM',
      isActive: true,
    },
  ];

  for (const clinic of clinics) {
    await prisma.clinic.upsert({
      where: { id: clinic.id },
      update: clinic,
      create: clinic,
    });
    console.log(`Seeded clinic: ${clinic.name} (${clinic.id})`);
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
