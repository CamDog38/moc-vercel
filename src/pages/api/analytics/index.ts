import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(req, res);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get date range from query params or use default (last 30 days)
    const { range = '30d', startDate, endDate } = req.query;
    
    // Calculate date range based on the provided range or custom dates
    let start: Date, end: Date = new Date();
    
    if (startDate && endDate) {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
    } else {
      // Default ranges
      switch(range) {
        case '7d':
          start = new Date();
          start.setDate(start.getDate() - 7);
          break;
        case '30d':
          start = new Date();
          start.setDate(start.getDate() - 30);
          break;
        case '90d':
          start = new Date();
          start.setDate(start.getDate() - 90);
          break;
        default:
          start = new Date();
          start.setDate(start.getDate() - 30);
      }
    }

    // Fetch leads count
    const leadsCount = await prisma.lead.count({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      }
    });

    // Fetch leads by day - aggregate in JS to group by DATE(createdAt)
    const leadsRaw = await prisma.lead.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      },
      select: {
        createdAt: true
      }
    });

    const leadsDailyMap: Record<string, number> = {};
    for (const lead of leadsRaw) {
      const date = lead.createdAt.toISOString().split('T')[0];
      leadsDailyMap[date] = (leadsDailyMap[date] || 0) + 1;
    }
    // Generate full date range array
    const dateArray: string[] = [];
    const currentDate = new Date(start);
    while (currentDate <= end) {
      dateArray.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const leadsDaily = dateArray.map(date => ({
      date,
      count: leadsDailyMap[date] || 0
    }));

    // Fetch bookings count
    const bookingsCount = await prisma.booking.count({
      where: {
        date: {
          gte: start,
          lte: end
        }
      }
    });

    // Fetch bookings by scheduled date - aggregate in JS to group by DATE(date)
    const bookingsRaw = await prisma.booking.findMany({
      where: {
        date: {
          gte: start,
          lte: end
        }
      },
      select: {
        date: true
      }
    });

    const bookingsDailyMap: Record<string, number> = {};
    for (const booking of bookingsRaw) {
      const dateStr = booking.date.toISOString().split('T')[0];
      bookingsDailyMap[dateStr] = (bookingsDailyMap[dateStr] || 0) + 1;
    }
    const bookingsDaily = dateArray.map(date => ({
      date,
      count: bookingsDailyMap[date] || 0
    }));

    // Fetch invoices sent count
    const invoicesSentCount = await prisma.invoice.count({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      }
    });

    // Fetch invoices paid count
    const invoicesPaidCount = await prisma.invoice.count({
      where: {
        status: 'paid',
        updatedAt: {
          gte: start,
          lte: end
        }
      }
    });

    // Fetch invoices by day (sent and paid) - using Prisma queries instead of raw SQL
    const invoicesByDay = await prisma.invoice.groupBy({
      by: ['createdAt'],
      _count: {
        id: true
      },
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Get paid invoices by day
    const paidInvoicesByDay = await prisma.invoice.groupBy({
      by: ['createdAt'],
      _count: {
        id: true
      },
      where: {
        status: 'paid',
        createdAt: {
          gte: start,
          lte: end
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Combine the data
    const invoicesDailyMap: Record<string, { sent_count: number; paid_count: number }> = {};
    for (const item of invoicesByDay) {
      const date = item.createdAt.toISOString().split('T')[0];
      invoicesDailyMap[date] = invoicesDailyMap[date] || { sent_count: 0, paid_count: 0 };
      invoicesDailyMap[date].sent_count = item._count.id;
    }
    for (const item of paidInvoicesByDay) {
      const date = item.createdAt.toISOString().split('T')[0];
      invoicesDailyMap[date] = invoicesDailyMap[date] || { sent_count: 0, paid_count: 0 };
      invoicesDailyMap[date].paid_count = item._count.id;
    }

    const invoicesDaily = dateArray.map(date => ({
      date,
      sent_count: invoicesDailyMap[date]?.sent_count || 0,
      paid_count: invoicesDailyMap[date]?.paid_count || 0
    }));

    // Fetch total revenue from paid invoices
    const totalRevenue = await prisma.invoice.aggregate({
      _sum: {
        totalAmount: true
      },
      where: {
        status: 'paid',
        updatedAt: {
          gte: start,
          lte: end
        }
      }
    });

    // Fetch marriage officers with their booking counts
    const officersWithBookings = await prisma.marriageOfficer.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        _count: {
          select: {
            invoices: {
              where: {
                booking: {
                  createdAt: {
                    gte: start,
                    lte: end
                  }
                }
              }
            }
          }
        }
      }
    });

    // Fetch form session data
    const formSessionsStarted = await prisma.formSession.count({
      where: {
        startedAt: {
          gte: start,
          lte: end
        }
      }
    });

    const formSessionsCompleted = await prisma.formSession.count({
      where: {
        status: 'COMPLETED',
        startedAt: {
          gte: start,
          lte: end
        }
      }
    });

    const formSessionsAbandoned = await prisma.formSession.count({
      where: {
        status: 'STARTED',
        completedAt: null,
        startedAt: {
          gte: start,
          lte: end
        }
      }
    });

    // Calculate rates
    const completionRate = formSessionsStarted > 0 
      ? ((formSessionsCompleted / formSessionsStarted) * 100).toFixed(2) + '%' 
      : '0%';
    
    const abandonmentRate = formSessionsStarted > 0 
      ? ((formSessionsAbandoned / formSessionsStarted) * 100).toFixed(2) + '%' 
      : '0%';

    // Get form-specific session data
    const forms = await prisma.form.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true
      }
    });

    const formSessionStats = await Promise.all(
      forms.map(async (form) => {
        const started = await prisma.formSession.count({
          where: {
            formId: form.id,
            startedAt: {
              gte: start,
              lte: end
            }
          }
        });

        const completed = await prisma.formSession.count({
          where: {
            formId: form.id,
            status: 'COMPLETED',
            startedAt: {
              gte: start,
              lte: end
            }
          }
        });

        const abandoned = await prisma.formSession.count({
          where: {
            formId: form.id,
            status: 'STARTED',
            completedAt: null,
            startedAt: {
              gte: start,
              lte: end
            }
          }
        });

        return {
          formId: form.id,
          formName: form.name,
          started,
          completed,
          abandoned,
          completionRate: started > 0 ? ((completed / started) * 100).toFixed(2) + '%' : '0%',
          abandonmentRate: started > 0 ? ((abandoned / started) * 100).toFixed(2) + '%' : '0%'
        };
      })
    );

    return res.status(200).json({
      leads: {
        total: leadsCount,
        daily: leadsDaily
      },
      bookings: {
        total: bookingsCount,
        daily: bookingsDaily
      },
      invoices: {
        sent: invoicesSentCount,
        paid: invoicesPaidCount,
        daily: invoicesDaily,
        revenue: totalRevenue._sum.totalAmount || 0
      },
      officers: officersWithBookings,
      formSessions: {
        started: formSessionsStarted,
        completed: formSessionsCompleted,
        abandoned: formSessionsAbandoned,
        completionRate,
        abandonmentRate,
        forms: formSessionStats
      }
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
}
