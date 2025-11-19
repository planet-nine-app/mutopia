# Mutopia Artist Seeding Guide

This guide shows how to add ONE test artist to each platform and verify it works.

## Prerequisites

Make sure Docker services are running:
```bash
cd /Users/zachbabb/Work/planet-nine/mutopia
docker compose up -d
```

---

## Step 1: Seed Artist in Mirlo (Prisma/PostgreSQL)

### Create the artist:

```bash
docker exec -it mutopia-mirlo-api node -e "
const { PrismaClient } = require('./prisma/__generated__');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

(async () => {
  try {
    // Create user
    const email = 'test-artist@mutopia.local';
    const password = await bcrypt.hash('test1234', 12);

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email, password, name: 'Test Artist User' }
      });
      console.log('✓ Created user:', user.email, '(ID:', user.id + ')');
    } else {
      console.log('ℹ User already exists:', user.email, '(ID:', user.id + ')');
    }

    // Create artist
    let artist = await prisma.artist.findFirst({ where: { urlSlug: 'test-artist' } });
    if (!artist) {
      artist = await prisma.artist.create({
        data: {
          name: 'Test Artist',
          bio: 'Test artist for Mutopia demo',
          urlSlug: 'test-artist',
          userId: user.id
        }
      });
      console.log('✓ Created artist:', artist.name, '(ID:', artist.id + ')');
    } else {
      console.log('ℹ Artist already exists:', artist.name, '(ID:', artist.id + ')');
    }

    console.log('\n✅ SUCCESS!');
    console.log('Artist ID:', artist.id);
    console.log('Artist URL: http://localhost:3001/test-artist');
    console.log('Artist API: http://localhost:3001/v1/artists/' + artist.id + '\n');
  } finally {
    await prisma.\$disconnect();
  }
})();
"
```

### Verify via Mirlo API:

```bash
# Check artist exists in database
docker exec -it mutopia-mirlo-api node -e "
const { PrismaClient } = require('./prisma/__generated__');
const prisma = new PrismaClient();
(async () => {
  try {
    const count = await prisma.artist.count();
    const artists = await prisma.artist.findMany({ take: 5 });
    console.log('Total artists in Mirlo:', count);
    artists.forEach(a => console.log('  -', a.name, '(ID:', a.id + ', Slug:', a.urlSlug + ')'));
  } finally {
    await prisma.\$disconnect();
  }
})();
"

# Check via API
curl http://localhost:3001/v1/artists | jq '.results[] | {id, name, urlSlug}'
```

---

## Step 2: Seed Artist in Jam.coop (Rails/PostgreSQL)

### Create the artist:

```bash
docker exec -it mutopia-jam-coop rails console
```

Then in the Rails console:

```ruby
# Create user
user = User.find_or_create_by!(email: 'test-artist@jam.local') do |u|
  u.password = 'test1234'
  u.verified = true
end
puts "User: #{user.email} (ID: #{user.id})"

# Create artist
artist = Artist.find_or_create_by!(user: user) do |a|
  a.name = 'Jam Test Artist'
  a.location = 'Portland, OR'
  a.description = 'Test artist for Mutopia demo'
end
puts "Artist: #{artist.name} (ID: #{artist.id}, Slug: #{artist.slug})"

puts "\n✅ SUCCESS!"
puts "Artist URL: http://localhost:3002/artists/#{artist.slug}"

# Exit the console
exit
```

### Verify via Jam.coop:

```bash
# Check artist count
docker exec -it mutopia-jam-coop rails runner "
puts 'Total artists in Jam: ' + Artist.count.to_s
Artist.limit(5).each do |a|
  puts '  - ' + a.name + ' (ID: ' + a.id.to_s + ', Slug: ' + a.slug + ')'
end
"

# Visit in browser
open http://localhost:3002/artists
```

---

## Step 3: Verify Sanora Feed

Sanora serves static content - no database to seed. Just verify the feed is accessible:

```bash
# Check Sanora feed
curl http://localhost:9090/feeds/canimus-feed.json | jq '{
  name: .name,
  artist_count: (.children | length),
  first_artist: .children[0].name
}'
```

---

## Summary

After running the above commands, you should have:

- **Mirlo**: 1 artist (`Test Artist`) accessible at http://localhost:3001/test-artist
- **Jam.coop**: 1 artist (`Jam Test Artist`) accessible at http://localhost:3002/artists
- **Sanora**: Feed serving artists at http://localhost:9090/feeds/canimus-feed.json

---

## Next Steps

1. **Set up payment processing**: Run `seed-payments.js` to create Addie payment accounts for artists
2. **Test the Mixtape Creator**: Visit http://localhost:3003 to see artists from all platforms
3. **Create albums/tracks**: Add content to the test artists via the web interfaces

---

## Troubleshooting

If any service isn't responding:

```bash
# Check service status
docker compose ps

# View logs
docker compose logs mirlo-api
docker compose logs jam-coop
docker compose logs sanora

# Restart specific service
docker compose restart mirlo-api
docker compose restart jam-coop
```
