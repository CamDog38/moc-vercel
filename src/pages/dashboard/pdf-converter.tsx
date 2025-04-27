import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PDFConverter from '@/components/PDFConverter';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function PDFConverterPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <h1 className="text-2xl font-bold mb-6">HTML to PDF Converter</h1>
          <p className="mb-6 text-gray-600">
            This tool allows you to convert HTML content to PDF documents. Enter your HTML below and click the convert button to generate a PDF.
          </p>
          <PDFConverter />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}