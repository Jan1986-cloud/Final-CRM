"use client";

import { useState, useTransition } from "react";
import type { Client } from "@/lib/types";
import { suggestRule, type SuggestRuleOutput } from "@/backend/ai/flows/suggest-rule";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb, Loader2, AlertCircle } from "lucide-react";

const availableRules = `
- Rule A: Send a follow-up email after 7 days of no contact.
- Rule B: Offer a 10% discount on their next purchase if they are a repeat customer.
- Rule C: Schedule a quarterly review call with high-value clients.
- Rule D: Assign a dedicated account manager for enterprise-level clients.
`.trim();

export function SuggestRuleForm({ clients }: { clients: Client[] }) {
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [rules, setRules] = useState(availableRules);
  const [result, setResult] = useState<SuggestRuleOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const handleSubmit = async () => {
    if (!selectedClient) {
      setError("Please select a client.");
      return;
    }
    setError(null);
    setResult(null);

    startTransition(async () => {
      try {
        const clientInformation = `
          Name: ${selectedClient.name}
          Email: ${selectedClient.email}
          Status: ${selectedClient.status}
          Joined: ${selectedClient.createdAt}
          Notes: ${selectedClient.notes}
        `.trim();

        const response = await suggestRule({
          clientInformation,
          availableRules: rules,
        });
        setResult(response);
      } catch (e) {
        console.error(e);
        setError("An error occurred while suggesting a rule. Please try again.");
      }
    });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Rule Suggestion</CardTitle>
          <CardDescription>
            Select a client and provide a list of rules. Our AI will suggest the best one to apply.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
                <Label htmlFor="client-select">Client</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger id="client-select">
                    <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                    {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                        {client.name}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
            {selectedClient && (
                <Card className="bg-muted/50">
                    <CardHeader className="p-4">
                        <CardTitle className="text-base">{selectedClient.name}</CardTitle>
                        <CardDescription>{selectedClient.status} Client</CardDescription>
                    </CardHeader>
                </Card>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="rules-textarea">Available Rules</Label>
            <Textarea
              id="rules-textarea"
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-4">
          <Button onClick={handleSubmit} disabled={isPending || !selectedClientId}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Lightbulb className="mr-2 h-4 w-4" />
            )}
            Suggest Rule
          </Button>

          {error && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="text-primary" />
                        AI Suggestion
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="font-semibold">Suggested Rule</h3>
                        <p className="text-primary font-medium">{result.suggestedRule}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold">Reasoning</h3>
                        <p className="text-muted-foreground">{result.reasoning}</p>
                    </div>
                </CardContent>
            </Card>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
