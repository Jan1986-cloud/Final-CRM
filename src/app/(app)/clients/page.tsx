
import { PageHeader } from "@/components/page-header";
import { getClients } from "@/backend/lib/data";
import { ClientsList } from "./clients-list";

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Clients" />
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <ClientsList initialClients={clients} />
      </main>
    </div>
  );
}
