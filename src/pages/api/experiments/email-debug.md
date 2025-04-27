# Email Debugging Experiments Log

## Step 1: Disable direct email sending in `submit.ts`

- **File:** `src/pages/api/forms/[id]/submit.ts`
- **Change:** Commented out the code that sends emails directly during form submission.
- **Status:** Done.

---

## Step 2: Disable email sending in `process-async.ts`

- **File:** `src/pages/api/emails/process-async.ts`
- **Change:** Next, comment out the call to `sendEmail()` inside `processEmailAsync`.
- **Reason:** To verify if emails are being sent from this async process or elsewhere.
- **Expected Result:** If emails still send, they originate from another location.

---

Next step: Comment out the `sendEmail` call in `process-async.ts`.
