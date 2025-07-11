
import { getClientById } from "@/backend/lib/data";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Edit, Calendar, Info } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ClientForm } from "../client-form";
import { DeleteClientButton } from "./delete-client-button";


export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { edit?: string };
}) {
  const client = await getClientById(params.id);
  const isEditMode = searchParams.edit === 'true';

  if (!client) {
    notFound();
  }

  if (isEditMode) {
      return (
        <div className="flex h-full flex-col">
          <PageHeader title={`Edit ${client.name}`}>
            <Button asChild variant="outline">
              <Link href={`/clients/${client.id}`}>Cancel</Link>
            </Button>
          </PageHeader>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <Card>
                <CardHeader>
                    <CardTitle>Client Information</CardTitle>
                    <CardDescription>Update the details for this client.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ClientForm client={client} />
                </CardContent>
            </Card>
          </main>
        </div>
      )
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={client.name}>
        <div className="flex items-center gap-2">
            <DeleteClientButton clientId={client.id} clientName={client.name} />
            <Button asChild>
            <Link href={`/clients/${client.id}?edit=true`}>
                <Edit />
                Edit Client
            </Link>
            </Button>
        </div>
      </PageHeader>
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <a href={`mailto:${client.email}`} className="hover:underline">
                    {client.email}
                  </a>
                </div>
                <div className="flex items-center gap-4">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <span>{client.phone}</span>
                </div>
                <div className="flex items-start gap-4">
                  <MapPin className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  <div>
                    <p>{client.address.street}</p>
                    <p>
                      {client.address.city}, {client.address.state}{" "}
                      {client.address.zip}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6 lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Client Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Info className="h-5 w-5 text-muted-foreground" />
                   <Badge variant={client.status === 'Active' ? 'default' : client.status === 'Lead' ? 'secondary' : 'destructive'}>
                      {client.status}
                    </Badge>
                </div>
                <div className="flex items-center gap-4">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span>Member since {format(new Date(client.createdAt), "MMMM yyyy")}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
