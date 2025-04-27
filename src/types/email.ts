import { EmailTemplateType } from '@prisma/client';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  type: EmailTemplateType;
  description?: string;
  folder?: string;
  ccEmails?: string;
  bccEmails?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  hasSubject: boolean;
  hasBody: boolean;
}