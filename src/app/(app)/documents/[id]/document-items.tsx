
"use client";

import { useState, useTransition } from "react";
import type { Article, Document, DocumentLine } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { addDocumentLineAction, deleteDocumentLineAction } from "@/backend/actions";
import { FilePlus2, Loader2, PlusCircle, Trash2 } from "lucide-react";

const lineItemSchema = z.object({
  articleId: z.string().min(1, "Please select an article."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
});

type DocumentItemsProps = {
  document: Document;
  articles: Article[];
};

export function DocumentItems({ document, articles }: DocumentItemsProps) {
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof lineItemSchema>>({
    resolver: zodResolver(lineItemSchema),
    defaultValues: {
      articleId: "",
      quantity: 1,
    },
  });

  function handleAddSubmit(values: z.infer<typeof lineItemSchema>) {
    startTransition(async () => {
      try {
        await addDocumentLineAction(document.id, values.articleId, values.quantity);
        toast({ title: "Line Item Added" });
        setAddDialogOpen(false);
        form.reset();
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: (error as Error).message,
        });
      }
    });
  }

  function openDeleteAlert(lineId: string) {
    setSelectedLineId(lineId);
    setDeleteAlertOpen(true);
  }

  function handleDeleteConfirm() {
    if (!selectedLineId) return;
    startTransition(async () => {
      try {
        await deleteDocumentLineAction(document.id, selectedLineId);
        toast({ title: "Line Item Removed" });
        setDeleteAlertOpen(false);
        setSelectedLineId(null);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: (error as Error).message,
        });
      }
    });
  }

  return (
    <>
      {document.regels.length === 0 ? (
        <div className="min-h-[200px] rounded-lg border border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-center p-8">
            <FilePlus2 className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Line Items</h3>
            <p className="text-muted-foreground mt-1">
                Get started by adding the first line item to this document.
            </p>
            <Button className="mt-4" onClick={() => setAddDialogOpen(true)}>Add Line Item</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60%]">Description</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {document.regels.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.omschrijving}</TableCell>
                    <TableCell>{line.aantal}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(line.prijs_per_eenheid_excl_btw)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                       {new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(line.totaal_excl_btw)}
                    </TableCell>
                    <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteAlert(line.id)} disabled={isPending}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setAddDialogOpen(true)} variant="outline">
                <PlusCircle /> Add Line Item
            </Button>
          </div>
        </div>
      )}

      {/* Add Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Line Item</DialogTitle>
            <DialogDescription>Select an article and specify the quantity to add to the document.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="articleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Article</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an article" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {articles.map((article) => (
                          <SelectItem key={article.id} value={article.id}>
                            {article.artikel_naam}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setAddDialogOpen(false)} disabled={isPending}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="animate-spin" />}
                  Add Item
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Alert */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This will permanently remove the line item from the document. This action cannot be undone.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteConfirm} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
                      {isPending && <Loader2 className="animate-spin" />}
                      Delete
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
