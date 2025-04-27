import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get the form with its fields
  const form = await prisma.form.findFirst({
    where: {
      name: 'Website Inquiry Form'
    },
    include: {
      leads: {
        include: {
          submissions: true
        }
      }
    }
  });

  console.log('Form details:', {
    id: form?.id,
    name: form?.name,
    fields: form?.fields,
  });

  if (form?.leads && form.leads.length > 0) {
    console.log('\nSample lead submission:', {
      leadId: form.leads[0].id,
      submissionData: form.leads[0].submissions[0]?.data
    });
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
