import React from 'react';

interface NoSidebarLayoutProps {
  children: React.ReactNode;
}

export default function NoSidebarLayout({ children }: NoSidebarLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col">
        <main className="flex-1 pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
