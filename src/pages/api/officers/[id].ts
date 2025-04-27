import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { ensureUserExists } from '@/util/auth-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(req, res);
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid officer ID' });
  }
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Ensure user exists in the database
    let dbUser;
    try {
      dbUser = await ensureUserExists(user);
    } catch (error) {
      console.error('Failed to ensure user exists:', error);
      return res.status(401).json({ error: 'Failed to verify user in database' });
    }

    // Get the officer to check ownership/permissions
    const officer = await prisma.marriageOfficer.findUnique({
      where: { id }
    });

    if (!officer) {
      return res.status(404).json({ error: 'Marriage officer not found' });
    }

    // Check permissions for editing
    if (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ADMIN') {
      // Marriage officers can only modify their own profile
      if (officer.userId !== user.id) {
        return res.status(403).json({ error: 'Not authorized to modify this officer' });
      }
    }

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        // Fetch the officer with their rates
        const officerWithRates = await prisma.marriageOfficer.findUnique({
          where: { id },
          include: {
            rates: true
          }
        });

        if (!officerWithRates) {
          return res.status(404).json({ error: 'Marriage officer not found' });
        }

        return res.status(200).json(officerWithRates);

      case 'PUT':
      case 'PATCH':
        const { title, firstName, lastName, phoneNumber, address, email } = req.body;

        if (!firstName || !lastName) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Update the marriage officer record
        const updatedOfficer = await prisma.marriageOfficer.update({
          where: { id },
          data: {
            title,
            firstName,
            lastName,
            phoneNumber,
            address
          }
        });

        // If email is being updated and user is an admin, update the user's email
        if (email && (dbUser.role === 'ADMIN' || dbUser.role === 'SUPER_ADMIN') && officer.userId) {
          try {
            if (process.env.NODE_ENV !== 'production') {
              console.log('Attempting to update email for user:', officer.userId);
            }
            if (process.env.NODE_ENV !== 'production') {
              console.log('New email:', email);
            }
            
            // Get the current user's email
            const existingUser = await prisma.user.findUnique({
              where: { id: officer.userId }
            });
            
            if (process.env.NODE_ENV !== 'production') {
              console.log('Existing user:', existingUser);
            }

            // Only update if the email is actually changing
            if (existingUser && existingUser.email !== email) {
              if (process.env.NODE_ENV !== 'production') {
                console.log('Email is changing from', existingUser.email, 'to', email);
              }
              
              // Update email in our database first
              await prisma.user.update({
                where: { id: officer.userId },
                data: { email }
              });
              
              // Update email in Supabase - make this optional
              try {
                const adminClient = createClient(req, res); // Changed to createClient
                if (process.env.NODE_ENV !== 'production') {
                  console.log('Admin client created for email update');
                }
                
                const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
                  officer.userId,
                  { email }
                );
                
                if (process.env.NODE_ENV !== 'production') {
                  console.log('Supabase update response:', updateData, 'Error:', updateError);
                }

                if (updateError) {
                  console.error('Error updating user email in Supabase:', updateError);
                  // Don't return an error, just log it - we'll continue with the officer update
                  console.warn('Continuing despite Supabase email update error');
                }
              } catch (supabaseError) {
                console.error('Exception in Supabase email update:', supabaseError);
                // Don't return an error, just log it - we'll continue with the officer update
                console.warn('Continuing despite Supabase email update exception');
              }
            } else {
              if (process.env.NODE_ENV !== 'production') {
                console.log('Email is not changing or user not found');
              }
            }
          } catch (error) {
            console.error('Error in email update process:', error);
            // Don't fail the entire update if just the email part fails
            console.warn('Continuing despite email update error');
          }
        }

        return res.status(200).json(updatedOfficer);

      case 'DELETE':
        // Only admins can delete officers
        if (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ADMIN') {
          return res.status(403).json({ error: 'Not authorized to delete officers' });
        }

        // Delete the marriage officer record
        await prisma.marriageOfficer.delete({
          where: { id }
        });

        // Note: We're not deleting the user account from Supabase or our database
        // This is to preserve history and avoid cascading issues

        return res.status(200).json({ message: 'Marriage officer deleted successfully' });

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Error in officers API:', error);
    return res.status(500).json({ error: 'Internal server error: ' + (error as Error).message });
  }
}
