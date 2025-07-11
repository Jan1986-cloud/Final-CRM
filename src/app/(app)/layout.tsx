import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { MainNav } from "@/components/main-nav";
import { BookUser, Cloud, CloudOff } from "lucide-react";
import { isAdminSdkInitialized } from "@/backend/lib/firebase-admin";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isConnected = isAdminSdkInitialized;

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 font-headline font-semibold text-lg">
            <BookUser className="h-6 w-6 shrink-0 text-primary" />
            <span className="group-data-[collapsible=icon]:hidden">Final CRM</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <MainNav />
        </SidebarContent>
        <SidebarFooter>
          <div
            className="p-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-2 flex justify-center"
            title={
              isConnected
                ? "Cloud Connected"
                : "Offline Mode. Data is not being saved to the cloud."
            }
          >
            {isConnected ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Cloud className="h-4 w-4 text-primary" />
                <span className="group-data-[collapsible=icon]:hidden">
                  Cloud Connected
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CloudOff className="h-4 w-4 text-destructive" />
                <span className="group-data-[collapsible=icon]:hidden">
                  Offline Mode
                </span>
              </div>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        {!isConnected && (
            <div className="p-4 border-b">
                <Alert variant="destructive">
                    <CloudOff className="h-4 w-4" />
                    <AlertTitle>You are in Offline Mode</AlertTitle>
                    <AlertDescription>
                    <p>Your changes are not being saved to the cloud. To connect your app to Firebase, please set your project credentials in the <strong>.env</strong> file.</p>
                    <p className="text-xs mt-2">You can find these in your Firebase project settings under Service Accounts.</p>
                    </AlertDescription>
                </Alert>
            </div>
        )}
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
