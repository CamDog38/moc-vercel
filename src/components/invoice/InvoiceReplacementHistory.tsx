import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { formatCurrency } from '@/util/format';

type Invoice = {
  id: string;
  status: string;
  createdAt: string;
  totalAmount: number;
  invoiceNumber?: string | null;
  voidReason?: string | null;
  voidComment?: string | null;
  voidedAt?: string | null;
  replacementInvoiceId?: string | null;
  originalInvoiceId?: string | null;
};

interface InvoiceReplacementHistoryProps {
  invoiceId: string;
  onClose?: () => void;
}

export function InvoiceReplacementHistory({ invoiceId, onClose }: InvoiceReplacementHistoryProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoiceHistory, setInvoiceHistory] = useState<Invoice[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    const fetchInvoiceHistory = async () => {
      if (!invoiceId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/invoices/${invoiceId}/history`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Set the current invoice
        const current = data.find((inv: Invoice) => inv.id === invoiceId);
        if (current) {
          setCurrentInvoice(current);
        }
        
        // Sort invoices by creation date (newest first)
        const sortedInvoices = data.sort((a: Invoice, b: Invoice) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        setInvoiceHistory(sortedInvoices);
      } catch (error) {
        console.error("Error fetching invoice history:", error);
        setError(error instanceof Error ? error.message : "Failed to load invoice history");
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvoiceHistory();
  }, [invoiceId]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'success';
      case 'voided':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>Loading invoice history...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription className="text-destructive">Error: {error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (invoiceHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>No invoice history found</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Replacement History</CardTitle>
        <CardDescription>
          {currentInvoice?.status === 'voided' 
            ? 'This invoice has been voided and replaced' 
            : currentInvoice?.originalInvoiceId 
              ? 'This invoice is a replacement for a previous invoice' 
              : 'View the history of this invoice and any replacements'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoiceHistory.map((invoice) => (
              <TableRow 
                key={invoice.id} 
                className={invoice.id === invoiceId ? 'bg-muted/50' : ''}
              >
                <TableCell>
                  {invoice.invoiceNumber || invoice.id.substring(0, 8).toUpperCase()}
                  {invoice.id === invoiceId && (
                    <span className="ml-2 text-xs text-muted-foreground">(Current)</span>
                  )}
                </TableCell>
                <TableCell>{new Date(invoice.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(invoice.status)}>
                    {invoice.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {invoice.status === 'voided' && (
                    <div>
                      <div className="text-sm font-medium">{invoice.voidReason}</div>
                      {invoice.voidComment && (
                        <div className="text-xs text-muted-foreground">{invoice.voidComment}</div>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => window.open(`/invoices/${invoice.id}/view?admin=true`, '_blank')}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}