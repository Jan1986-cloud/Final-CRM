
'use server';

import { revalidatePath } from 'next/cache';
import { addClient, updateClient, createDocument as createDocumentData, addArticle, updateArticle, deleteClient, deleteArticle, addDocumentLine, deleteDocumentLine } from '@/backend/lib/data';
import type { Client, Document, Article } from '@/lib/types';
import * as z from 'zod';
import { redirect } from 'next/navigation';

const clientSchema = z.object({
  id: z.string().optional(),
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


export async function saveClientAction(data: z.infer<typeof clientSchema> & { id?: string }) {
    const validatedFields = clientSchema.safeParse(data);

    if (!validatedFields.success) {
        throw new Error("Invalid client data");
    }

    const { id, ...clientData } = validatedFields.data;

    let savedClient;
    if (id) {
        savedClient = await updateClient(id, clientData);
    } else {
        savedClient = await addClient(clientData);
    }
    
    revalidatePath('/clients');
    if (id) {
      revalidatePath(`/clients/${id}`);
    }
    revalidatePath('/documents');

    return savedClient;
}

export async function deleteClientAction(id: string) {
    if (!id) {
        throw new Error("Client ID is required");
    }
    await deleteClient(id);
    revalidatePath('/clients');
    revalidatePath('/documents');
    // The redirect will be handled on the client-side after the action completes
}


export async function createDocumentAction(data: { klant_id: string; document_type: Document['document_type']; }) {
    if (!data.klant_id || !data.document_type) {
        throw new Error("Client and document type are required");
    }

    const newDocument = await createDocumentData(data.klant_id, data.document_type);
    
    revalidatePath('/documents');
    redirect(`/documents/${newDocument.id}`);
}

const articleSchema = z.object({
    id: z.string().optional(),
    artikel_naam: z.string().min(2, "Name must be at least 2 characters."),
    artikel_omschrijving_kort: z.string().min(5, "Short description is required."),
    artikel_omschrijving_lang: z.string().optional(),
    artikel_fotos: z.array(z.object({
        foto_url: z.string().url("Invalid URL format.").or(z.literal('')),
        foto_omschrijving: z.string(),
    })).optional(),
    artikel_urls: z.array(z.object({
        value: z.string().url("Invalid URL format.").or(z.literal(''))
    })).optional(),
    artikel_magazijnlocatie: z.string().optional(),
    artikel_prijs_excl_btw: z.coerce.number().min(0, "Price must be a positive number."),
    artikel_korting_percentage: z.coerce.number().min(0).max(100).optional().default(0),
    artikel_btw_percentage: z.coerce.number().min(0),
    artikel_eenheid: z.string().min(1, "Unit is required."),
});

export async function saveArticleAction(data: z.infer<typeof articleSchema> & { id?: string }) {
    const transformedData = {
        ...data,
        artikel_urls: data.artikel_urls?.map(u => u.value).filter(Boolean) || [],
         artikel_fotos: data.artikel_fotos?.filter(f => f.foto_url) || [],
    };
    
    // a slightly different schema for validation after transform
    const articleSaveSchema = articleSchema.extend({
        artikel_urls: z.array(z.string().url()).optional(),
        artikel_fotos: z.array(z.object({
            foto_url: z.string().url(),
            foto_omschrijving: z.string(),
        })).optional(),
    })

    const validatedFields = articleSaveSchema.safeParse(transformedData);

    if (!validatedFields.success) {
        console.error(validatedFields.error.flatten().fieldErrors);
        throw new Error("Invalid article data");
    }

    const { id, ...articleData } = validatedFields.data;
    
    let savedArticle;
    if (id) {
        savedArticle = await updateArticle(id, articleData);
    } else {
        savedArticle = await addArticle(articleData);
    }
    
    revalidatePath('/articles');
    if (id) {
      revalidatePath(`/articles/${id}`);
    }

    return savedArticle;
}

export async function deleteArticleAction(id: string) {
    if (!id) {
        throw new Error("Article ID is required");
    }
    await deleteArticle(id);
    revalidatePath('/articles');
    // The redirect will be handled on the client-side after the action completes
}


// --- Document Line Item Actions ---

export async function addDocumentLineAction(documentId: string, articleId: string, quantity: number) {
    if (!documentId || !articleId || !quantity) {
        throw new Error("Document ID, Article ID, and quantity are required.");
    }
    
    await addDocumentLine(documentId, articleId, quantity);
    revalidatePath(`/documents/${documentId}`);
}

export async function deleteDocumentLineAction(documentId: string, lineId: string) {
    if (!documentId || !lineId) {
        throw new Error("Document ID and Line ID are required.");
    }

    await deleteDocumentLine(documentId, lineId);
    revalidatePath(`/documents/${documentId}`);
}
