/**
 * Seed a test artist in Mirlo
 * Run inside Mirlo container from prisma directory:
 * cd /var/www/api/prisma && yarn ts-node ../seed-mirlo-artist.ts
 */

import { PrismaClient } from "./__generated__/index.js";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  MIRLO ARTIST SEEDING');
  console.log('═══════════════════════════════════════════════');
  console.log('');

  try {
    // Create user first
    const email = 'test-artist@mutopia.local';
    const password = await hashPassword('test1234');

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (user) {
      console.log(`  ℹ User already exists: ${user.email} (ID: ${user.id})`);
    } else {
      user = await prisma.user.create({
        data: {
          email,
          password,
          name: 'Test Artist User'
        }
      });
      console.log(`  ✓ Created user: ${user.email} (ID: ${user.id})`);
    }

    // Check if artist already exists
    let artist = await prisma.artist.findFirst({
      where: { urlSlug: 'test-artist' }
    });

    if (artist) {
      console.log(`  ℹ Artist already exists: ${artist.name} (ID: ${artist.id})`);
    } else {
      // Create artist
      artist = await prisma.artist.create({
        data: {
          name: 'Test Artist',
          bio: 'Test artist for Mutopia demo',
          urlSlug: 'test-artist',
          userId: user.id
        }
      });
      console.log(`  ✓ Created artist: ${artist.name} (ID: ${artist.id})`);
    }

    console.log('');
    console.log('  ✅ SUCCESS!');
    console.log('');
    console.log(`  Artist ID: ${artist.id}`);
    console.log(`  Artist URL: http://localhost:3001/test-artist`);
    console.log(`  Artist API: http://localhost:3001/v1/artists/${artist.id}`);
    console.log('');
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
