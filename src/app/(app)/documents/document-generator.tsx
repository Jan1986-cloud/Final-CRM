"use client";

import { useState, useTransition, useEffect } from "react";
import type { Client, Document } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { createDocumentAction } from "@/backend/actions";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, PlusCircle } from "lucide-react";
import { ClientForm } from "../clients/client-form";

export function DocumentGenerator({ clients: initialClients }: { clients: Client[] }) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedDocType, setSelectedDocType] = useState<Document['document_type'] | "">("");
  const [isCreateClientOpen, setCreateClientOpen] = useState(false);
  
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);

  const handleGenerate = () => {
    if (!selectedClientId || !selectedDocType) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select a client and a document type.",
      });
      return;
    }
    
    startTransition(async () => {
      try {
        await createDocumentAction({
          klant_id: selectedClientId,
          document_type: selectedDocType as Document['document_type'],
        });
        toast({
          title: "Document Generated",
          description: "Redirecting to the new document...",
        });
      } catch (e: any) {
        console.error(e);
        toast({
          variant: "destructive",
          title: "Error",
          description: e.message || "Failed to generate document.",
        });
      }
    });
  };

  const handleClientCreated = (newClient: Client) => {
    setClients(prev => [newClient, ...prev]);
    setSelectedClientId(newClient.id);
    setCreateClientOpen(false);
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Generate Document</CardTitle>
          <CardDescription>
            Select a client and document type to generate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client-select">Client</Label>
            <Select
              value={selectedClientId}
              onValueChange={(value) => {
                if (value === "--create-new--") {
                  setCreateClientOpen(true);
                  // Ensure we don't try to set the value to the trigger text
                  setTimeout(() => setSelectedClientId(""), 0);
                } else {
                  setSelectedClientId(value);
                }
              }}
            >
              <SelectTrigger id="client-select">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="--create-new--">
                    <div className="flex items-center gap-2">
                        <PlusCircle className="h-4 w-4" />
                        <span>Create new client...</span>
                    </div>
                </SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-type-select">Document Type</Label>
            <Select
              value={selectedDocType}
              onValueChange={(value) => setSelectedDocType(value as any)}
            >
              <SelectTrigger id="doc-type-select">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Quote">Quote</SelectItem>
                <SelectItem value="Work Order">Work Order</SelectItem>
                <SelectItem value="Invoice">Invoice</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerate} className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />}
            Generate Document
          </Button>
        </CardFooter>
      </Card>
      
      <Dialog open={isCreateClientOpen} onOpenChange={setCreateClientOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Client</DialogTitle>
            <DialogDescription>
              Fill out the form below to add a new client to the system.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto p-1 pr-4">
              <ClientForm onFinished={handleClientCreated} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
