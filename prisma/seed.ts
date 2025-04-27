import { PrismaClient, UserRole } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'test@example.com',
      role: UserRole.MARRIAGE_OFFICER,
      marriageOfficer: {
        create: {
          firstName: 'Test',
          lastName: 'User',
        }
      }
    },
  });

  // Create test form
  const form = await prisma.form.upsert({
    where: { id: 'test-form-id' },
    update: {},
    create: {
      id: 'test-form-id',
      name: 'Test Contact Form',
      description: 'A test contact form for email automation',
      type: 'INQUIRY',
      isActive: true,
      userId: user.id,
      sections: [],
    },
  });

  // Create test email template
  const template = await prisma.emailTemplate.upsert({
    where: { id: 'test-template-id' },
    update: {},
    create: {
      id: 'test-template-id',
      name: 'Test Confirmation Email',
      description: 'Confirmation email for form submissions',
      subject: 'Thank you for your submission, {{name}}!',
      htmlContent: `
        <h1>Thank you for contacting us!</h1>
        <p>Dear {{name}},</p>
        <p>We have received your inquiry and will get back to you shortly.</p>
        <p>Your details:</p>
        <ul>
          <li>Email: {{email}}</li>
          {{#if phone}}
          <li>Phone: {{phone}}</li>
          {{/if}}
        </ul>
        <p>Best regards,<br>The Team</p>
      `,
      userId: user.id,
      type: 'CUSTOM'
    },
  });

  // Create test email rule
  const rule = await prisma.emailRule.upsert({
    where: { id: 'test-rule-id' },
    update: {},
    create: {
      id: 'test-rule-id',
      name: 'Send Confirmation Email',
      description: 'Send confirmation email when form is submitted',
      conditions: '{"email":{"$ne":null},"name":{"$ne":null}}',
      active: true,
      formId: form.id,
      templateId: template.id,
      userId: user.id,
    },
  });

  console.log({
    user,
    form,
    template,
    rule,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
