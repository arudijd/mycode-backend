const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();


async function main() {
  // Hapus semua data sebelum seeding
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Membuat user dengan detail
  const user1 = await prisma.user.create({
    data: {
      id: 'USR001',
      email: 'john.doe@example.com',
      image: 'https://example.com/images/john.jpg',
      password: hashedPassword,
      name: 'John Doe',
      about: 'Software Engineer from San Francisco',
      social_media: {
        twitter: '@johndoe',
        linkedin: 'https://linkedin.com/in/johndoe'
      },
      posts: {
        create: [
          {
            id: 'PST003',
            title: 'My First Post',
            content: 'This is the content of my first post.',
          },
          {
            id: 'PST004',
            title: 'Another Post',
            content: 'This is some more content.',
          },
        ]
      }
    }
  });

  const user2 = await prisma.user.create({
    data: {
      id: 'USR002',
      email: 'jane.smith@example.com',
      image: 'https://example.com/images/jane.jpg',
      password: hashedPassword,
      name: 'Jane Smith',
      about: 'Product Manager from New York',
      social_media: {
        twitter: '@janesmith',
        linkedin: 'https://linkedin.com/in/janesmith'
      },
      posts: {
        create: [
          {
            id: 'PST001',
            title: 'Welcome Post',
            content: 'Welcome to my first post!',
          },
          {
            id: 'PST002',
            title: 'Follow Up Post',
            content: 'Here is some more content.',
          },
        ]
      }
    }
  });

  console.log({ user1, user2 });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
