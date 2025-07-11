
import { getArticleById } from "@/backend/lib/data";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Globe, ImageIcon, Link as LinkIcon, Package, Tag, Warehouse } from "lucide-react";
import Link from "next/link";
import { ArticleForm } from "../article-form";
import Image from "next/image";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { DeleteArticleButton } from "./delete-article-button";

export default async function ArticleDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { edit?: string };
}) {
  const article = await getArticleById(params.id);
  const isEditMode = searchParams.edit === 'true';

  if (!article) {
    notFound();
  }

  if (isEditMode) {
      return (
        <div className="flex h-full flex-col">
          <PageHeader title={`Edit ${article.artikel_naam}`}>
            <Button asChild variant="outline">
              <Link href={`/articles/${article.id}`}>Cancel</Link>
            </Button>
          </PageHeader>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <div className="mx-auto max-w-3xl">
                <ArticleForm article={article} />
            </div>
          </main>
        </div>
      )
  }

  const priceBtw = article.artikel_prijs_excl_btw * (1 + article.artikel_btw_percentage / 100);
  const priceDiscount = priceBtw * (1 - article.artikel_korting_percentage / 100);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={article.artikel_naam}>
        <div className="flex items-center gap-2">
            <DeleteArticleButton articleId={article.id} articleName={article.artikel_naam} />
            <Button asChild>
            <Link href={`/articles/${article.id}?edit=true`}>
                <Edit />
                Edit Article
            </Link>
            </Button>
        </div>
      </PageHeader>
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
             {article.artikel_fotos && article.artikel_fotos.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ImageIcon /> Photos</CardTitle>
                    </CardHeader>
                    <CardContent>
                       <Carousel className="w-full max-w-3xl mx-auto">
                           <CarouselContent>
                                {article.artikel_fotos.map((photo, index) => (
                                    <CarouselItem key={index}>
                                        <div className="p-1">
                                            <Card>
                                                <CardContent className="flex aspect-video items-center justify-center p-0 relative">
                                                    <Image src={photo.foto_url} alt={photo.foto_omschrijving} fill className="object-cover rounded-lg" data-ai-hint="product photo" />
                                                    <div className="absolute bottom-0 w-full bg-black/50 text-white p-2 text-center text-sm">
                                                        {photo.foto_omschrijving}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </CarouselItem>
                                ))}
                           </CarouselContent>
                            <CarouselPrevious />
                            <CarouselNext />
                       </Carousel>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Article Information</CardTitle>
                            <CardDescription>{article.artikel_omschrijving_kort}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground whitespace-pre-wrap">{article.artikel_omschrijving_lang}</p>
                        </CardContent>
                    </Card>
                     {article.artikel_urls && article.artikel_urls.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><LinkIcon /> Related URLs</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {article.artikel_urls.map((url, index) => (
                                    <a href={url} key={index} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                                        <Globe className="h-4 w-4" />
                                        <span>{url}</span>
                                    </a>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
                <div className="space-y-6 lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pricing & Stock</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-baseline">
                                <span className="text-muted-foreground">Price (excl. VAT)</span>
                                <span className="font-semibold">{new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(article.artikel_prijs_excl_btw)}</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="text-muted-foreground">VAT</span>
                                <span>{article.artikel_btw_percentage}%</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="text-muted-foreground">Discount</span>
                                <span>{article.artikel_korting_percentage}%</span>
                            </div>
                             <div className="flex justify-between items-baseline font-bold text-lg border-t pt-4">
                                <span>Final Price</span>
                                <span>{new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(priceDiscount)}</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Details</CardTitle>
                        </CardHeader>
                         <CardContent className="space-y-4">
                            <div className="flex items-center gap-4">
                                <Package className="h-5 w-5 text-muted-foreground" />
                                <span>Unit: <Badge variant="outline">{article.artikel_eenheid}</Badge></span>
                            </div>
                            <div className="flex items-center gap-4">
                                <Warehouse className="h-5 w-5 text-muted-foreground" />
                                <span>Location: <Badge variant="secondary">{article.artikel_magazijnlocatie}</Badge></span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}
