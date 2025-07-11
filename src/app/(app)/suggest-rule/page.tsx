import { getClients } from "@/backend/lib/data";
import { SuggestRuleForm } from "./suggest-rule-form";
import { PageHeader } from "@/components/page-header";

export default async function SuggestRulePage() {
  const clients = await getClients();

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="AI Rule Suggester" />
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <SuggestRuleForm clients={clients} />
      </main>
    </div>
  );
}
