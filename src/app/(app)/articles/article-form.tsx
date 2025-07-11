
"use client";

import type { Article } from "@/lib/types";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { saveArticleAction } from "@/backend/actions";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const articleSchema = z.object({
  artikel_naam: z.string().min(2, "Name must be at least 2 characters."),
  artikel_omschrijving_kort: z.string().min(5, "Short description is required."),
  artikel_omschrijving_lang: z.string().optional(),
  artikel_fotos: z.array(z.object({
      foto_url: z.string().url("Invalid URL format.").or(z.literal('')),
      foto_omschrijving: z.string(),
  })).optional(),
  artikel_urls: z.array(z.object({
      value: z.string().url("Invalid URL format.").or(z.literal('')),
  })).optional(),
  artikel_magazijnlocatie: z.string().optional(),
  artikel_prijs_excl_btw: z.coerce.number().min(0, "Price must be a positive number."),
  artikel_korting_percentage: z.coerce.number().min(0, "Discount must be >= 0").max(100, "Discount must be <= 100").optional().default(0),
  artikel_btw_percentage: z.coerce.number().min(0, "VAT must be a positive number."),
  artikel_eenheid: z.string().min(1, "Unit is required."),
});

type ArticleFormProps = {
  article?: Article | null;
  onFinished?: (article: Article) => void;
};

export function ArticleForm({ article, onFinished }: ArticleFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof articleSchema>>({
    resolver: zodResolver(articleSchema),
    defaultValues: article ? {
        ...article,
        artikel_urls: article.artikel_urls.map(url => ({ value: url })),
    } : {
      artikel_naam: "",
      artikel_omschrijving_kort: "",
      artikel_omschrijving_lang: "",
      artikel_fotos: [],
      artikel_urls: [],
      artikel_magazijnlocatie: "",
      artikel_prijs_excl_btw: 0,
      artikel_korting_percentage: 0,
      artikel_btw_percentage: 21,
      artikel_eenheid: "piece",
    },
  });

  const { fields: photoFields, append: appendPhoto, remove: removePhoto } = useFieldArray({
    control: form.control,
    name: "artikel_fotos",
  });

  const { fields: urlFields, append: appendUrl, remove: removeUrl } = useFieldArray({
    control: form.control,
    name: "artikel_urls",
  });

  function onSubmit(values: z.infer<typeof articleSchema>) {
    startTransition(async () => {
      try {
        const dataToSave = article ? { ...values, id: article.id } : values;
        const savedArticle = await saveArticleAction(dataToSave);
        toast({
          title: article ? "Article Updated" : "Article Created",
          description: `Article "${savedArticle.artikel_naam}" has been successfully saved.`,
        });
        onFinished?.(savedArticle);
        router.refresh();
      } catch (error) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Error",
          description: (error as Error).message || "Failed to save article. Please try again.",
        });
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="artikel_naam"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Article Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Pro Widget" {...field} disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="artikel_omschrijving_kort"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Short Description</FormLabel>
              <FormControl>
                <Input placeholder="A short, catchy description" {...field} disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="artikel_omschrijving_lang"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Long Description</FormLabel>
              <FormControl>
                <Textarea placeholder="A detailed description of the article" className="resize-y" {...field} disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
             <FormField
                control={form.control}
                name="artikel_magazijnlocatie"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Warehouse Location</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Aisle 5, Shelf C" {...field} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="artikel_eenheid"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., piece, kg, box" {...field} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <FormField
                control={form.control}
                name="artikel_prijs_excl_btw"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Price (excl. VAT)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" {...field} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="artikel_btw_percentage"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>VAT (%)</FormLabel>
                    <FormControl>
                        <Input type="number" step="1" {...field} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="artikel_korting_percentage"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Discount (%)</FormLabel>
                    <FormControl>
                        <Input type="number" step="1" {...field} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Photos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {photoFields.map((field, index) => (
                    <div key={field.id} className="flex gap-4 items-end p-2 border rounded-lg">
                        <FormField
                            control={form.control}
                            name={`artikel_fotos.${index}.foto_url`}
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormLabel>Photo URL</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://placehold.co/600x400.png" {...field} disabled={isPending} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`artikel_fotos.${index}.foto_omschrijving`}
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormLabel>Photo Description</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Front view" {...field} disabled={isPending} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="button" variant="destructive" size="icon" onClick={() => removePhoto(index)} disabled={isPending}>
                            <Trash2 />
                        </Button>
                    </div>
                ))}
                 <Button type="button" variant="outline" onClick={() => appendPhoto({ foto_url: '', foto_omschrijving: '' })}>
                    <PlusCircle /> Add Photo
                </Button>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Related URLs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {urlFields.map((field, index) => (
                    <div key={field.id} className="flex gap-4 items-end">
                        <FormField
                            control={form.control}
                            name={`artikel_urls.${index}.value`}
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                     <FormLabel>URL</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://example.com/product-info" {...field} disabled={isPending} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeUrl(index)} disabled={isPending}>
                            <Trash2 />
                        </Button>
                    </div>
                ))}
                <Button type="button" variant="outline" onClick={() => appendUrl({ value: '' })}>
                    <PlusCircle /> Add URL
                </Button>
            </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />}
            {article ? "Save Changes" : "Create Article"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
