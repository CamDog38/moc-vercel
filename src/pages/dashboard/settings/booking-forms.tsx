import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Form {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
}

export default function BookingFormSettings() {
  const router = useRouter();
  const [bookingForms, setBookingForms] = useState<Form[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all booking forms and the current setting
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch all booking forms
        const formsResponse = await fetch("/api/forms?type=BOOKING");
        if (!formsResponse.ok) {
          throw new Error("Failed to fetch booking forms");
        }
        const formsData = await formsResponse.json();
        const activeBookingForms = formsData.filter(
          (form: Form) => form.type === "BOOKING" && form.isActive
        );
        setBookingForms(activeBookingForms);

        // Fetch current setting
        const settingsResponse = await fetch("/api/settings");
        if (!settingsResponse.ok) {
          throw new Error("Failed to fetch settings");
        }
        const settingsData = await settingsResponse.json();
        const defaultBookingFormSetting = settingsData.find(
          (setting: any) => setting.key === "defaultBookingFormId"
        );

        if (defaultBookingFormSetting) {
          setSelectedFormId(defaultBookingFormSetting.value);
        } else if (activeBookingForms.length > 0) {
          // If no setting exists but we have forms, use the first one as default
          setSelectedFormId(activeBookingForms[0].id);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(error instanceof Error ? error.message : "An error occurred");
        toast({
          variant: "destructive",
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load data",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Save the selected booking form as default
  const saveDefaultBookingForm = async () => {
    if (!selectedFormId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a booking form first",
      });
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: "defaultBookingFormId",
          value: selectedFormId,
          description: "Default booking form ID for {{bookingLink}} variable",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save default booking form");
      }

      toast({
        title: "Success",
        description: "Default booking form saved successfully",
      });
    } catch (error) {
      console.error("Error saving setting:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save setting",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button
          variant="outline"
          className="mr-4"
          onClick={() => router.push("/dashboard/settings")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Settings
        </Button>
        <h1 className="text-3xl font-bold">Booking Form Settings</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Default Booking Form</CardTitle>
              <CardDescription>
                Select the default booking form to use with the {"{{"} bookingLink {"}}"}  variable in email templates.
                This is the form that will be linked when sending emails to leads.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {isLoading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : bookingForms.length === 0 ? (
                <Alert>
                  <AlertTitle>No booking forms available</AlertTitle>
                  <AlertDescription>
                    You need to create at least one active booking form first.
                    <div className="mt-2">
                      <Button onClick={() => router.push("/dashboard/forms/create")}>
                        Create Booking Form
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="bookingForm" className="text-sm font-medium">
                      Select Default Booking Form
                    </label>
                    <Select
                      value={selectedFormId}
                      onValueChange={setSelectedFormId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a booking form" />
                      </SelectTrigger>
                      <SelectContent>
                        {bookingForms.map((form) => (
                          <SelectItem key={form.id} value={form.id}>
                            {form.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator className="my-4" />

                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>
                      The selected form will be used when generating booking links with the 
                      {"{{"} bookingLink {"}}"}  variable in email templates.
                    </p>
                    <p>
                      When a lead receives an email with this variable, they will be directed
                      to complete the selected booking form. The system will track that the booking 
                      originated from this lead.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                onClick={saveDefaultBookingForm}
                disabled={isLoading || isSaving || !selectedFormId}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Usage Instructions</CardTitle>
              <CardDescription>
                How to use booking links in your email templates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm space-y-3">
                <p>
                  The {"{{"} bookingLink {"}}"}  variable can be used in your email templates to automatically 
                  generate a tracking link to your booking form.
                </p>
                
                <div className="bg-muted p-3 rounded-md">
                  <p className="font-medium">Example:</p>
                  <pre className="text-xs mt-2 whitespace-pre-wrap">
                    {`<p>Please complete your booking by clicking <a href="{{bookingLink}}">here</a>.</p>`}
                  </pre>
                </div>
                
                <p>
                  When this email is sent to a lead, the system will:
                </p>
                
                <ul className="list-disc list-inside space-y-1">
                  <li>Generate a unique link to your default booking form</li>
                  <li>Include tracking information to associate the booking with the lead</li>
                  <li>Replace the variable with the full URL in the email</li>
                </ul>
                
                <p className="font-medium mt-2">
                  This allows you to smoothly transition leads to bookings with proper attribution.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 