
import { PageHeader } from "@/components/page-header";
import { getArticles } from "@/backend/lib/data";
import { ArticlesList } from "./articles-list";

export default async function ArticlesPage() {
  const articles = await getArticles();

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Articles" />
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <ArticlesList initialArticles={articles} />
      </main>
    </div>
  );
}
