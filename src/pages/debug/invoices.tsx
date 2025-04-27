import { useEffect, useState } from "react";

export default function DebugInvoicesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDebugData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/debug/invoices");
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Error fetching debug data:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchDebugData();
  }, []);

  if (loading) return <div className="p-8">Loading debug data...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!data) return <div className="p-8">No data available</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Invoices Data</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Summary</h2>
        <p>Total invoices: {data.invoicesCount}</p>
        <p>Bookings with assigned users: {data.bookingsWithAssignedUsers?.length || 0}</p>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Bookings with Assigned Users</h2>
        {data.bookingsWithAssignedUsers?.length > 0 ? (
          <table className="min-w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Booking ID</th>
                <th className="border p-2">Name</th>
                <th className="border p-2">Assigned User ID</th>
              </tr>
            </thead>
            <tbody>
              {data.bookingsWithAssignedUsers.map((booking: any) => (
                <tr key={booking.id}>
                  <td className="border p-2">{booking.id}</td>
                  <td className="border p-2">{booking.name}</td>
                  <td className="border p-2">{booking.assignedUserId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No bookings with assigned users found</p>
        )}
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-2">Invoices</h2>
        {data.invoices?.length > 0 ? (
          <table className="min-w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Invoice ID</th>
                <th className="border p-2">Booking ID</th>
                <th className="border p-2">Client Name</th>
                <th className="border p-2">Assigned User ID</th>
                <th className="border p-2">Status</th>
                <th className="border p-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.map((invoice: any) => (
                <tr key={invoice.id}>
                  <td className="border p-2">{invoice.id}</td>
                  <td className="border p-2">{invoice.bookingId}</td>
                  <td className="border p-2">{invoice.booking?.name}</td>
                  <td className="border p-2">{invoice.booking?.assignedUserId || 'None'}</td>
                  <td className="border p-2">{invoice.status}</td>
                  <td className="border p-2">R{invoice.totalAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No invoices found</p>
        )}
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Raw Data</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}
