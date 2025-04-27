import React from "react";
import Head from "next/head";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Head>
        <title>Marriage Officers Portal</title>
        <meta name="description" content="Marriage Officers Portal - Streamline your marriage services" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="bg-background min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          {/* Hero Section */}
          <section className="py-20 px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-teal-400">
              Marriage Officers Portal
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-8">
              Streamline your marriage services with our comprehensive platform for Marriage Officers, 
              Administrators, and Couples.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="bg-gradient-to-r from-blue-500 to-teal-400 hover:from-blue-600 hover:to-teal-500">
                  Login to Portal
                </Button>
              </Link>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-16 px-4 bg-secondary/20">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle>Easy Form Submission</CardTitle>
                  <CardDescription>
                    Submit your marriage-related documents and applications through our user-friendly forms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>✓ Simple and intuitive interface</li>
                    <li>✓ Save and resume later</li>
                    <li>✓ Automatic progress tracking</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardHeader>
                  <CardTitle>Marriage Officers</CardTitle>
                  <CardDescription>
                    Dedicated portal for managing your marriage services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>✓ Manage bookings efficiently</li>
                    <li>✓ Track applications</li>
                    <li>✓ Document management</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardHeader>
                  <CardTitle>Administrative Control</CardTitle>
                  <CardDescription>
                    Comprehensive admin tools for system management
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>✓ User management</li>
                    <li>✓ Form builder</li>
                    <li>✓ Analytics dashboard</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
