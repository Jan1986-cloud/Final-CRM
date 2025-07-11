
"use client";

import type { Client } from "@/lib/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { saveClientAction } from "@/backend/actions";
import { Loader2 } from "lucide-react";

const clientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  phone: z.string().min(10, "Phone number is too short."),
  address: z.object({
    street: z.string().min(2, "Street is required."),
    city: z.string().min(2, "City is required."),
    state: z.string().min(2, "State is required."),
    zip: z.string().min(5, "Zip code is required."),
  }),
  status: z.enum(["Lead", "Active", "Inactive"]),
  notes: z.string().optional(),
});

type ClientFormProps = {
  client?: Client | null;
  onFinished?: (client: Client) => void;
};

export function ClientForm({ client, onFinished }: ClientFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: client || {
      name: "",
      email: "",
      phone: "",
      address: { street: "", city: "", state: "", zip: "" },
      status: "Lead",
      notes: "",
    },
  });

  function onSubmit(values: z.infer<typeof clientSchema>) {
    startTransition(async () => {
      try {
        const dataToSave = client ? { ...values, id: client.id } : values;
        const savedClient = await saveClientAction(dataToSave);
        toast({
          title: client ? "Client Updated" : "Client Created",
          description: `Client "${savedClient.name}" has been successfully saved.`,
        });
        onFinished?.(savedClient);
        router.refresh();
      } catch (error) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Error",
          description: (error as Error).message || "Failed to save client. Please try again.",
        });
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="john.doe@example.com" {...field} disabled={isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="(555) 123-4567" {...field} disabled={isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
            control={form.control}
            name="address.street"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Street Address</FormLabel>
                <FormControl>
                    <Input placeholder="123 Main St" {...field} disabled={isPending} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="address.city"
            render={({ field }) => (
                <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                    <Input placeholder="Anytown" {...field} disabled={isPending} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
            control={form.control}
            name="address.state"
            render={({ field }) => (
                <FormItem>
                <FormLabel>State / Province</FormLabel>
                <FormControl>
                    <Input placeholder="CA" {...field} disabled={isPending} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="address.zip"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Zip / Postal Code</FormLabel>
                <FormControl>
                    <Input placeholder="12345" {...field} disabled={isPending} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Lead">Lead</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Initial meeting details, client requirements, etc."
                  className="resize-none"
                  {...field}
                  disabled={isPending}
                />
              </FormControl>
              <FormDescription>
                Any relevant notes about this client.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />}
            {client ? "Save Changes" : "Create Client"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
