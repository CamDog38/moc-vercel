import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get all forms
  const forms = await prisma.form.findMany();
  if (process.env.NODE_ENV !== 'production') {
    console.log('Forms:', JSON.stringify(forms, null, 2));
  }

  // Get all leads with their forms and submissions
  const leads = await prisma.lead.findMany({
    include: {
      form: true,
      submissions: {
        select: {
          id: true,
          data: true,
        },
      },
    },
  });
  if (process.env.NODE_ENV !== 'production') {
    console.log('\nLeads with Forms and Submissions:', JSON.stringify(leads, null, 2));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });