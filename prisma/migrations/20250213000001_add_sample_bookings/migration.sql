-- Add sample bookings
INSERT INTO "Booking" ("id", "date", "time", "location", "status", "email", "phone", "name", "formId", "createdAt", "updatedAt")
SELECT 
  'clsample1', -- id
  NOW() + interval '7 days', -- date
  '14:00', -- time
  'Beach Resort', -- location
  'PENDING', -- status
  'john.doe@example.com', -- email
  '+1234567890', -- phone
  'John Doe', -- name
  (SELECT "id" FROM "Form" LIMIT 1), -- formId
  NOW(), -- createdAt
  NOW() -- updatedAt
WHERE EXISTS (SELECT 1 FROM "Form" LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM "Booking" WHERE "id" = 'clsample1');

-- Add sample form submission for the booking
INSERT INTO "FormSubmission" ("id", "formId", "data", "bookingId", "createdAt")
SELECT 
  'clsubmission1', -- id
  (SELECT "id" FROM "Form" LIMIT 1), -- formId
  '{"name": "John Doe", "email": "john.doe@example.com", "phone": "+1234567890", "date": "2025-02-20", "time": "14:00", "location": "Beach Resort", "message": "Looking forward to the ceremony!"}', -- data
  'clsample1', -- bookingId
  NOW() -- createdAt
WHERE EXISTS (SELECT 1 FROM "Booking" WHERE "id" = 'clsample1')
AND NOT EXISTS (SELECT 1 FROM "FormSubmission" WHERE "id" = 'clsubmission1');