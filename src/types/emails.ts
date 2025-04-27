export interface ProcessEmailResult {
  ruleId: string;
  sent: boolean;
  emailId?: string;
  error?: string;
  message: string;
}

export interface SendTemplateParams {
  to: string;
  subject: string;
  html: string;
  cc?: string;
  bcc?: string;
  userId?: string;
  templateId?: string;
  formSubmissionId?: string;
} 