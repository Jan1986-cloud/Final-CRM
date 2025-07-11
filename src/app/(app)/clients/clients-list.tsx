
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Search } from "lucide-react";
import type { Client } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClientForm } from "./client-form";
import { format } from "date-fns";

export function ClientsList({ initialClients }: { initialClients: Client[] }) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilters, setStatusFilters] = useState<Record<string, boolean>>({
    Lead: true,
    Active: true,
    Inactive: true,
  });
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);


  const filteredClients = useMemo(() => {
    return clients
      .filter((client) =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter((client) => statusFilters[client.status]);
  }, [clients, searchTerm, statusFilters]);

  const handleStatusChange = (status: string, checked: boolean) => {
    setStatusFilters((prev) => ({ ...prev, [status]: checked }));
  };

  return (
    <>
      <div className="mb-4 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Filter Status</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {Object.keys(statusFilters).map((status) => (
              <DropdownMenuCheckboxItem
                key={status}
                checked={statusFilters[status]}
                onCheckedChange={(checked) => handleStatusChange(status, !!checked)}
              >
                {status}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
            <Button>
                <PlusCircle />
                New Client
            </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Create New Client</DialogTitle>
                <DialogDescription>
                Fill out the form below to add a new client to the system.
                </DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto p-1 pr-4">
                <ClientForm onFinished={(newClient) => {
                    setClients(prev => [newClient, ...prev]);
                    setCreateDialogOpen(false)
                }} />
            </div>
            </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden lg:table-cell">Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map((client) => (
              <TableRow
                key={client.id}
                className="cursor-pointer"
                onClick={() => router.push(`/clients/${client.id}`)}
              >
                <TableCell className="font-medium">
                  {client.name}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {client.email}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {client.phone}
                </TableCell>
                <TableCell>
                  <Badge variant={client.status === 'Active' ? 'default' : client.status === 'Lead' ? 'secondary' : 'destructive'}>
                    {client.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {format(new Date(client.createdAt), "MMM d, yyyy")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {filteredClients.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          No clients found.
        </div>
      )}
    </>
  );
}
