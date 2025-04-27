import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { createClient } from '@/util/supabase/api'
import { ensureUserExists } from '@/util/auth-helpers'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(req, res)
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Ensure user exists in the database
    let dbUser;
    try {
      dbUser = await ensureUserExists(user);
    } catch (error) {
      console.error('Failed to ensure user exists:', error);
      return res.status(401).json({ error: 'Failed to verify user in database' });
    }

    switch (req.method) {
      case 'GET':
        // Allow ADMIN and SUPER_ADMIN to see all officers
        if (dbUser.role !== 'ADMIN' && dbUser.role !== 'SUPER_ADMIN') {
          // For marriage officers, only return their own data
          const ownOfficer = await prisma.marriageOfficer.findUnique({
            where: { userId: user.id },
            include: {
              rates: true,
              user: {
                select: {
                  email: true,
                }
              }
            }
          })
          return res.status(200).json(ownOfficer ? [ownOfficer] : [])
        }

        const officers = await prisma.marriageOfficer.findMany({
          include: {
            rates: true,
            user: {
              select: {
                email: true,
              }
            }
          }
        })
        return res.status(200).json(officers)

      case 'POST':
        if (process.env.NODE_ENV !== 'production') {
          console.log('Received POST request body:', req.body);
        }
        const { title, firstName, lastName, email, phoneNumber, address } = req.body
        
        // Validate required fields
        if (!firstName || !lastName || !email) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('Missing required fields:', { firstName, lastName, email });
          }
          return res.status(400).json({ error: 'Missing required fields: firstName, lastName, and email are required' })
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('Invalid email format:', email);
          }
          return res.status(400).json({ error: 'Invalid email format. Please provide a valid email address.' });
        }

        // Check if user has permission to create officers
        if (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ADMIN') {
          if (process.env.NODE_ENV !== 'production') {
            console.log('User role not authorized:', dbUser.role);
          }
          return res.status(403).json({ error: 'Not authorized to create officers' })
        }

        // Check if user with this email already exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
          include: { marriageOfficer: true }
        })

        if (process.env.NODE_ENV !== 'production') {
          console.log('Existing user check:', existingUser);
        }

        if (existingUser) {
          if (existingUser.marriageOfficer) {
            return res.status(400).json({ error: 'User is already a marriage officer' })
          }

          // Create marriage officer for existing user
          const officer = await prisma.marriageOfficer.create({
            data: {
              title,
              firstName,
              lastName,
              phoneNumber,
              address,
              userId: existingUser.id
            }
          })
          return res.status(201).json(officer)
        }

        try {
          // Create an admin client with service role permissions
          if (process.env.NODE_ENV !== 'production') {
            console.log('Creating admin client...');
          }
          // Since we can't use createAdminClient, we'll use a workaround
          const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
          const adminClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
              auth: {
                autoRefreshToken: false,
                persistSession: false
              }
            }
          );
          if (process.env.NODE_ENV !== 'production') {
            console.log('Admin client created');
          }
          
          // Generate a random password for the new user
          const randomPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
          
          // Create the user directly instead of sending an invitation
          if (process.env.NODE_ENV !== 'production') {
            console.log('Creating user directly with email:', email);
          }
          const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
            email,
            password: randomPassword,
            email_confirm: true,
            user_metadata: { 
              firstName, 
              lastName,
              role: 'MARRIAGE_OFFICER'
            }
          });

          if (process.env.NODE_ENV !== 'production') {
            console.log('User creation response:', userData, 'Error:', userError);
          }

          if (userError) {
            console.error('Error creating user in Supabase:', userError);
            return res.status(400).json({ error: 'Failed to create user: ' + userError.message });
          }

          // Get the user ID from the response
          const userId = userData.user?.id;
          
          if (!userId) {
            console.error('No user ID returned from user creation');
            return res.status(400).json({ error: 'Failed to get user ID from creation response' });
          }

          // Create the user in our database
          const newDbUser = await prisma.user.create({
            data: {
              id: userId,
              email: email,
              role: 'MARRIAGE_OFFICER'
            }
          });

          // Create the marriage officer record
          const officer = await prisma.marriageOfficer.create({
            data: {
              title,
              firstName,
              lastName,
              phoneNumber,
              address,
              userId: newDbUser.id
            }
          });

          return res.status(201).json({
            ...officer,
            message: 'Marriage officer created successfully. A temporary password has been generated.'
          });
        } catch (error) {
          console.error('Error in user/officer creation:', error);
          return res.status(400).json({ error: 'Failed to create user and officer: ' + (error as Error).message })
        }

      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
    }
  } catch (error) {
    console.error('Error in officers API:', error)
    return res.status(500).json({ error: 'Internal server error: ' + (error as Error).message })
  }
}