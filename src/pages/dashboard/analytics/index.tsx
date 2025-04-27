import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { DateTimePicker } from '../../../components/ui/date-time-picker';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { Loader2, Calendar, Users, Receipt, CreditCard } from 'lucide-react';

interface AnalyticsData {
  leads: {
    total: number;
    previousTotal: number;
    daily: Array<{ date: string; count: number }>;
  };
  bookings: {
    total: number;
    previousTotal: number;
    daily: Array<{ date: string; count: number }>;
  };
  invoices: {
    sent: number;
    previousSent: number;
    paid: number;
    previousPaid: number;
    daily: Array<{ date: string; sent_count: number; paid_count: number }>;
    revenue: number;
  };
  officers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    _count: {
      invoices: number;
    };
  }>;
  formSessions?: {
    started: number;
    completed: number;
    abandoned: number;
    completionRate: string;
    abandonmentRate: string;
    forms: Array<{
      formId: string;
      formName: string;
      started: number;
      completed: number;
      abandoned: number;
      completionRate: string;
      abandonmentRate: string;
    }>;
  };
}

export default function AnalyticsDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/analytics?range=${dateRange}`;
      if (dateRange === 'custom' && startDate && endDate) {
        url = `/api/analytics?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch analytics data' }));
        throw new Error(errorData.error || 'Failed to fetch analytics data');
      }
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, startDate, endDate]);

  const handleDateRangeChange = (value: string) => {
    const range = value as '7d' | '30d' | '90d' | 'custom';
    setDateRange(range);
    if (range !== 'custom') {
      switch (range) {
        case '7d':
          setStartDate(subDays(new Date(), 7));
          break;
        case '30d':
          setStartDate(subDays(new Date(), 30));
          break;
        case '90d':
          setStartDate(subDays(new Date(), 90));
          break;
      }
      setEndDate(new Date());
    }
  };

  const formatChartData = (data: any[] | undefined) => {
    if (!data || !Array.isArray(data)) return [];
    return data.map((item) => ({
      ...item,
      date: item.date ? format(new Date(item.date), 'MMM dd') : 'Unknown',
    }));
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <div className="flex items-center space-x-4">
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
          {dateRange === 'custom' && (
            <div className="flex items-center space-x-2">
              <DateTimePicker date={startDate} setDate={setStartDate} />
              <span>to</span>
              <DateTimePicker date={endDate} setDate={setEndDate} />
              <Button onClick={fetchAnalyticsData}>Apply</Button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading analytics data...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col justify-center items-center h-64">
          <div className="text-red-500 mb-4">Error: {error}</div>
          <Button onClick={fetchAnalyticsData}>Retry</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData?.leads.total || 0}</div>
                <p className="text-xs text-muted-foreground">in selected period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData?.bookings.total || 0}</div>
                <p className="text-xs text-muted-foreground">in selected period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Invoices Sent</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData?.invoices.sent || 0}</div>
                <p className="text-xs text-muted-foreground">{analyticsData?.invoices.paid || 0} paid</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${analyticsData?.invoices?.revenue?.toFixed(2) ?? '0.00'}
                </div>
                <p className="text-xs text-muted-foreground">from paid invoices</p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="leads">Leads</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="officers">Marriage Officers</TabsTrigger>
              <TabsTrigger value="formSessions">Form Sessions</TabsTrigger>
              <TabsTrigger value="funnel">Funnel</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Business Overview</CardTitle>
                  <CardDescription>Combined view of leads, bookings, and invoices over time</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={
                        (analyticsData?.leads?.daily || []).map((leadDay) => {
                          const bookingDay = (analyticsData?.bookings?.daily || []).find(
                            (b) => b.date === leadDay.date
                          );
                          const invoiceDay = (analyticsData?.invoices?.daily || []).find(
                            (i) => i.date === leadDay.date
                          );
                          return {
                            date: leadDay.date,
                            leads: leadDay.count || 0,
                            bookings: bookingDay?.count || 0,
                            invoices: invoiceDay?.sent_count || 0,
                          };
                        })
                      }
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="leads" name="Leads" stackId="a" fill="#8884d8" />
                      <Bar dataKey="bookings" name="Bookings" stackId="a" fill="#82ca9d" />
                      <Bar dataKey="invoices" name="Invoices Sent" stackId="a" fill="#ffc658" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="leads" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Leads Generated</CardTitle>
                  <CardDescription>Number of leads generated per day</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={formatChartData(analyticsData?.leads?.daily || [])}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Leads" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bookings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Bookings Generated</CardTitle>
                  <CardDescription>Number of bookings created per day</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={formatChartData(analyticsData?.bookings?.daily || [])}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Bookings" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Invoices Sent vs Paid</CardTitle>
                  <CardDescription>Comparison of invoices sent and paid per day</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={formatChartData(analyticsData?.invoices?.daily || [])}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="sent_count" name="Invoices Sent" fill="#ffc658" />
                      <Bar dataKey="paid_count" name="Invoices Paid" fill="#ff8042" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="officers" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Marriage Officers Performance</CardTitle>
                  <CardDescription>Number of bookings handled by each marriage officer</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={(analyticsData?.officers || []).map((officer) => ({
                        name: `${officer.firstName} ${officer.lastName}`.trim() || 'Unknown',
                        bookings: officer._count.invoices || 0,
                      }))}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="bookings" name="Bookings" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="formSessions" className="space-y-4">
              {analyticsData?.formSessions ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{analyticsData.formSessions.started || 0}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{analyticsData.formSessions.completed || 0}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Abandoned</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{analyticsData.formSessions.abandoned || 0}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{analyticsData.formSessions.completionRate || '0%'}</div>
                      </CardContent>
                    </Card>
                    <Card
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => router.push('/dashboard/forms/abandoned')}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Abandonment Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{analyticsData.formSessions.abandonmentRate || '0%'}</div>
                        <p className="text-xs text-muted-foreground">Click to view abandoned forms</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Form Completion Rates</CardTitle>
                      <CardDescription>Completion and abandonment rates by form</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                      {Array.isArray(analyticsData.formSessions.forms) && analyticsData.formSessions.forms.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={analyticsData.formSessions.forms}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="formName" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="completed" name="Completed" fill="#82ca9d" />
                            <Bar dataKey="abandoned" name="Abandoned" fill="#ff8042" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-muted-foreground">No form data available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Form Sessions</CardTitle>
                    <CardDescription>No form session data available</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Form session tracking data is not available.</p>
                      <Button
                        className="mt-4"
                        onClick={() => router.push('/dashboard/forms/abandoned')}
                      >
                        View Abandoned Forms
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="funnel" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Conversion Funnel</CardTitle>
                  <CardDescription>Step-by-step conversion from leads to paid invoices</CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsData && (
                    <div className="flex flex-col md:flex-row justify-between items-stretch gap-4">
                      {[
                        {
                          label: 'Leads',
                          current: analyticsData.leads.total,
                          previous: analyticsData.leads.previousTotal,
                          prevStepCount: null,
                        },
                        {
                          label: 'Bookings',
                          current: analyticsData.bookings.total,
                          previous: analyticsData.bookings.previousTotal,
                          prevStepCount: analyticsData.leads.total,
                        },
                        {
                          label: 'Invoices Sent',
                          current: analyticsData.invoices.sent,
                          previous: analyticsData.invoices.previousSent,
                          prevStepCount: analyticsData.bookings.total,
                        },
                        {
                          label: 'Invoices Paid',
                          current: analyticsData.invoices.paid,
                          previous: analyticsData.invoices.previousPaid,
                          prevStepCount: analyticsData.invoices.sent,
                        },
                      ].map((step, idx) => {
                        const percentChange =
                          step.previous === 0 ? 0 : ((step.current - step.previous) / step.previous) * 100;
                        const conversionRate =
                          step.prevStepCount && step.prevStepCount > 0
                            ? (step.current / step.prevStepCount) * 100
                            : null;
                        return (
                          <div
                            key={idx}
                            className="flex-1 border rounded-lg p-4 flex flex-col items-center justify-center bg-muted/50"
                          >
                            <div className="text-sm font-medium mb-2">{step.label}</div>
                            <div className="text-2xl font-bold mb-1">{step.current}</div>
                            {conversionRate !== null && (
                              <div className="text-xs text-muted-foreground mb-1">
                                {conversionRate.toFixed(1)}% conversion
                              </div>
                            )}
                            <div
                              className={`text-xs font-medium ${
                                percentChange > 0
                                  ? 'text-green-600'
                                  : percentChange < 0
                                  ? 'text-red-600'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {percentChange > 0 && '▲'}
                              {percentChange < 0 && '▼'}
                              {Math.abs(percentChange).toFixed(1)}% vs prev
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
