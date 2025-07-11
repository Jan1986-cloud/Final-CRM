import { getClients, getDocuments } from "@/backend/lib/data";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { DocumentGenerator } from "./document-generator";
import { ArrowRight } from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";

export default async function DocumentsPage() {
  const clients = await getClients();
  const documents = await getDocuments();

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Documents" />
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <DocumentGenerator clients={clients} />
          </div>
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => {
                       const badgeVariant = {
                        Paid: "default",
                        Sent: "secondary",
                        Draft: "outline",
                        concept: "outline",
                      }[doc.document_status] as "default" | "secondary" | "outline";

                      return (
                        <TableRow key={doc.id}>
                          <TableCell>{doc.clientName}</TableCell>
                          <TableCell>{doc.document_type}</TableCell>
                          <TableCell className="font-mono text-xs">{doc.document_nummer}</TableCell>
                          <TableCell>{format(new Date(doc.document_datum), "MMM d, yyyy")}</TableCell>
                          <TableCell>
                            <Badge variant={badgeVariant}>
                              {doc.document_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                              <Button asChild variant="ghost" size="icon">
                                <Link href={`/documents/${doc.id}`} >
                                  <ArrowRight className="h-4 w-4" />
                                </Link>
                              </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
