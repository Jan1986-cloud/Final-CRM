import { getDocumentById, getArticles } from "@/backend/lib/data";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { DocumentItems } from "./document-items";

export default async function DocumentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const doc = await getDocumentById(params.id);
  if (!doc) {
    notFound();
  }

  const client = await getClientById(doc.klant_id);
  const articles = await getArticles();

  const badgeVariant = {
    Paid: "default",
    Sent: "secondary",
    Draft: "outline",
    concept: "outline",
  }[doc.document_status] as "default" | "secondary" | "outline";


  return (
    <div className="flex h-full flex-col">
      <PageHeader title={`Document ${doc.document_nummer}`} />
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <Card className="mx-auto max-w-4xl">
          <CardHeader>
            <div className="flex items-start justify-between">
                <div>
                    <CardTitle className="text-3xl font-bold">{doc.document_type}</CardTitle>
                    <CardDescription className="pt-2">
                        For: {client?.name ?? 'N/A'}
                    </CardDescription>
                </div>
                <div className="text-right">
                    <p className="font-semibold text-lg">{doc.document_nummer}</p>
                    <p className="text-sm text-muted-foreground">
                        Date: {format(new Date(doc.document_datum), "PPP")}
                    </p>
                    <div className="mt-2">
                        <Badge variant={badgeVariant}>
                            {doc.document_status}
                        </Badge>
                    </div>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <Separator className="my-6" />
            
            <DocumentItems document={doc} articles={articles} />

            <Separator className="my-6" />

            <div className="flex justify-end">
              <div className="grid w-full max-w-sm gap-2 text-right">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(doc.totaal_subtotaal_excl_btw)}</span>
                </div>
                 <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">VAT</span>
                  <span>{new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(doc.totaal_btw_bedrag)}</span>
                </div>
                 <div className="flex items-center justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(doc.totaal_incl_btw)}</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-6">
            <div className="flex w-full justify-end gap-2">
                <Button variant="outline" disabled>Download PDF</Button>
                <Button disabled>Send Document</Button>
            </div>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
