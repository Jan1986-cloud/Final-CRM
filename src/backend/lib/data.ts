
import type { Client, Company, Document, Article, DocumentLine } from '@/lib/types';
import { adminDb, isAdminSdkInitialized } from './firebase-admin';
import { firestore } from 'firebase-admin';
import type { firestore as firestore_type } from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

// Helper to serialize Firestore data, converting Timestamps to ISO strings
function serialize<T>(doc: firestore_type.DocumentSnapshot): T {
    const data = doc.data() as any;
    // Recursively serialize Timestamps
    const serializeObject = (obj: any) => {
        if (!obj) return obj;
        for (const key in obj) {
            if (obj[key] && typeof obj[key].toDate === 'function') {
                 obj[key] = obj[key].toDate().toISOString();
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                serializeObject(obj[key]);
            }
        }
        return obj;
    }
    return { id: doc.id, ...serializeObject(data) } as T;
}

let hasLoggedDatastoreError = false;
const logDatastoreModeError = () => {
    if (hasLoggedDatastoreError) return;
    console.warn("********************************************************************************************************");
    console.warn("*** PROJECT CONFIGURATION ERROR: Firestore is in Datastore Mode. *************************************");
    console.warn("*** This application requires Firestore in Native Mode. You must create a new project. ***************");
    console.warn("*** Falling back to OFFLINE MODE. Data is not being saved. *******************************************");
    console.warn("********************************************************************************************************");
    hasLoggedDatastoreError = true;
};

const isDatastoreModeError = (error: any): boolean => {
    return !!error.message?.includes('Firestore in Datastore Mode');
}


// --- MOCK DATABASE FOR LOCAL DEVELOPMENT ---
let nextId = 100;
const mockDb: { clients: Client[], articles: Article[], documents: Document[] } = {
  clients: [
    { id: 'mock_1', name: 'Globex Corporation', email: 'contact@globex.com', phone: '555-0101', address: { street: '123 Industrial Way', city: 'Springfield', state: 'IL', zip: '62701' }, status: 'Active', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), notes: 'High-value client, potential for a large-scale project in Q3.' },
    { id: 'mock_2', name: 'Stark Industries', email: 'pepper.potts@stark.com', phone: '555-0102', address: { street: '10880 Malibu Point', city: 'Malibu', state: 'CA', zip: '90265' }, status: 'Lead', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), notes: 'Initial contact made. Follow up scheduled for next week.' }
  ],
  articles: [
    { id: 'mock_art_1', artikel_naam: 'Pro Widget', artikel_omschrijving_kort: 'The latest and greatest widget.', artikel_omschrijving_lang: 'A full description of the Pro Widget.', artikel_fotos: [], artikel_urls: [], artikel_magazijnlocatie: 'A5-3', artikel_prijs_excl_btw: 199.99, artikel_korting_percentage: 0, artikel_btw_percentage: 21, artikel_eenheid: 'piece' },
    { id: 'mock_art_2', artikel_naam: 'Basic Gadget', artikel_omschrijving_kort: 'A reliable, everyday gadget.', artikel_omschrijving_lang: 'A full description of the Basic Gadget.', artikel_fotos: [], artikel_urls: [], artikel_magazijnlocatie: 'B2-1', artikel_prijs_excl_btw: 49.95, artikel_korting_percentage: 5, artikel_btw_percentage: 21, artikel_eenheid: 'piece' }
  ],
  documents: [],
};
const getNextId = () => `mock_${++nextId}`;
// --- END MOCK DATABASE ---


// --- Client Data ---

export async function getClients(): Promise<Client[]> {
  if (!isAdminSdkInitialized) {
    console.warn("Firebase not configured. Using mock data for clients.");
    return JSON.parse(JSON.stringify(mockDb.clients)).sort((a: Client, b: Client) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  try {
    const snapshot = await adminDb.collection('clients').orderBy('createdAt', 'desc').get();
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => serialize<Client>(doc));
  } catch (error: any) {
    if (isDatastoreModeError(error)) {
        logDatastoreModeError();
        return JSON.parse(JSON.stringify(mockDb.clients)).sort((a: Client, b: Client) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    console.error("Error fetching clients:", error);
    return [];
  }
}

export async function getClientById(id: string): Promise<Client | null> {
  if (!isAdminSdkInitialized) {
    console.warn(`Firebase not configured. Using mock data for getClientById(${id}).`);
    const client = mockDb.clients.find(c => c.id === id);
    return client ? JSON.parse(JSON.stringify(client)) : null;
  }
  try {
    const doc = await adminDb.collection('clients').doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return serialize<Client>(doc);
  } catch (error: any) {
    if (isDatastoreModeError(error)) {
        logDatastoreModeError();
        const client = mockDb.clients.find(c => c.id === id);
        return client ? JSON.parse(JSON.stringify(client)) : null;
    }
    console.error(`Error fetching client ${id}:`, error);
    return null;
  }
}

export async function addClient(clientData: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
    if (!isAdminSdkInitialized) {
        throw new Error("Firebase not configured. Cannot add client in offline mode.");
    }
    const clientPayload = {
        ...clientData,
        createdAt: new Date(),
    };
    const docRef = await adminDb.collection('clients').add(clientPayload);
    return { id: docRef.id, ...clientPayload, createdAt: clientPayload.createdAt.toISOString() };
}

export async function updateClient(id: string, clientData: Partial<Omit<Client, 'id' | 'createdAt'>>): Promise<Client> {
    if (!isAdminSdkInitialized) {
        throw new Error("Firebase not configured. Cannot update client in offline mode.");
    }
    const docRef = adminDb.collection('clients').doc(id);
    await docRef.update(clientData);
    const updatedDoc = await docRef.get();
    return serialize<Client>(updatedDoc);
}

export async function deleteClient(id: string): Promise<void> {
    if (!isAdminSdkInitialized) {
        throw new Error("Firebase not configured. Cannot delete client in offline mode.");
    }
    await adminDb.collection('clients').doc(id).delete();
}

// --- Company Data ---

export const company: Company = {
  name: 'Final CRM Inc.',
  logoUrl: 'https://placehold.co/128x128.png',
  address: '789 CRM Lane, Suite 100, San Francisco, CA 94103',
  phone: '1-800-555-CRMS',
  email: 'hello@finalcrm.com',
  website: 'https://www.finalcrm.com',
};

export async function getCompany(): Promise<Company> {
  return company;
}


// --- Document Data ---

function recalculateDocumentTotals(regels: DocumentLine[]): { subtotal: number, vat: number, total: number } {
    let subtotal = 0;
    let vat = 0;

    for (const regel of regels) {
        subtotal += regel.totaal_excl_btw;
        vat += regel.totaal_excl_btw * (regel.btw_percentage / 100);
    }
    const total = subtotal + vat;
    return { subtotal, vat, total };
}

export async function getDocuments(): Promise<Document[]> {
    if (!isAdminSdkInitialized) {
        console.warn("Firebase not configured. Using mock data for documents.");
        const docs = mockDb.documents.map(doc => ({
            ...doc,
            clientName: mockDb.clients.find(c => c.id === doc.klant_id)?.name || 'Unknown Client'
        }));
        return JSON.parse(JSON.stringify(docs)).sort((a: Document, b: Document) => new Date(b.document_datum).getTime() - new Date(a.document_datum).getTime());
    }
    try {
        const snapshot = await adminDb.collection('documenten').orderBy('document_datum', 'desc').get();
        if (snapshot.empty) return [];

        const docs = snapshot.docs.map(doc => serialize<Document>(doc));
        
        const clientIds = [...new Set(docs.map(doc => doc.klant_id))];
        if (clientIds.length === 0) return docs;

        const clientSnapshot = await adminDb.collection('clients').where(firestore.FieldPath.documentId(), 'in', clientIds).get();
        const clientMap = new Map(clientSnapshot.docs.map(doc => [doc.id, doc.data().name]));

        return docs.map(doc => ({
            ...doc,
            clientName: clientMap.get(doc.klant_id) || 'Unknown Client'
        }));
    } catch (error: any) {
        if (isDatastoreModeError(error)) {
            logDatastoreModeError();
            const docs = mockDb.documents.map(doc => ({
                ...doc,
                clientName: mockDb.clients.find(c => c.id === doc.klant_id)?.name || 'Unknown Client'
            }));
            return JSON.parse(JSON.stringify(docs)).sort((a: Document, b: Document) => new Date(b.document_datum).getTime() - new Date(a.document_datum).getTime());
        }
        console.error("Error fetching documents:", error);
        return [];
    }
}

export async function getDocumentById(id: string): Promise<Document | null> {
    if (!isAdminSdkInitialized) {
        console.warn(`Firebase not configured. Using mock data for getDocumentById(${id}).`);
        const doc = mockDb.documents.find(d => d.id === id);
        if (!doc) return null;
        const clientName = mockDb.clients.find(c => c.id === doc.klant_id)?.name || 'Unknown Client';
        return JSON.parse(JSON.stringify({ ...doc, clientName }));
    }
    try {
        const doc = await adminDb.collection('documenten').doc(id).get();
        if (!doc.exists) return null;
        return serialize<Document>(doc);
    } catch (error: any) {
        if (isDatastoreModeError(error)) {
            logDatastoreModeError();
            const doc = mockDb.documents.find(d => d.id === id);
            if (!doc) return null;
            const clientName = mockDb.clients.find(c => c.id === doc.klant_id)?.name || 'Unknown Client';
            return JSON.parse(JSON.stringify({ ...doc, clientName }));
        }
        console.error(`Error fetching document ${id}:`, error);
        return null;
    }
}

export async function createDocument(klant_id: string, document_type: Document['document_type']): Promise<Document> {
    if (!isAdminSdkInitialized) {
        throw new Error("Firebase not configured. Cannot create document in offline mode.");
    }
    const client = await getClientById(klant_id);
    if (!client) throw new Error("Client not found");

    const prefix = { 'Quote': 'Q', 'Work Order': 'WO', 'Invoice': 'I' }[document_type];
    const docQuery = await adminDb.collection('documenten').where('document_type', '==', document_type).get();
    const docCount = docQuery.size;
    
    const newDocPayload = {
        document_type: document_type,
        document_nummer: `${prefix}-${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2, '0')}-${(docCount + 1).toString().padStart(3,'0')}`,
        document_datum: new Date(),
        document_status: 'concept' as const,
        klant_id: klant_id,
        regels: [],
        totaal_subtotaal_excl_btw: 0,
        totaal_btw_bedrag: 0,
        totaal_incl_btw: 0,
    };

    const docRef = await adminDb.collection('documenten').add(newDocPayload);
    
    return { 
        id: docRef.id, 
        ...newDocPayload, 
        clientName: client.name,
        document_datum: newDocPayload.document_datum.toISOString()
    };
}


export async function addDocumentLine(documentId: string, articleId: string, quantity: number) {
  if (!isAdminSdkInitialized) {
    throw new Error("Firebase not configured. Cannot add document line in offline mode.");
  }
  const article = await getArticleById(articleId);
  if (!article) throw new Error("Article not found.");

  const lineTotalExclBtw = article.artikel_prijs_excl_btw * quantity * (1 - article.artikel_korting_percentage / 100);

  const newLine: DocumentLine = {
    id: uuidv4(),
    artikel_id: articleId,
    omschrijving: article.artikel_naam,
    aantal: quantity,
    eenheid: article.artikel_eenheid,
    prijs_per_eenheid_excl_btw: article.artikel_prijs_excl_btw,
    btw_percentage: article.artikel_btw_percentage,
    korting_percentage: article.artikel_korting_percentage,
    totaal_excl_btw: lineTotalExclBtw,
  };

  
  const docRef = adminDb.collection('documenten').doc(documentId);
  const doc = await docRef.get();
  if (!doc.exists) throw new Error("Document not found.");
  
  const currentRegels = doc.data()?.regels || [];
  const updatedRegels = [...currentRegels, newLine];
  
  const { subtotal, vat, total } = recalculateDocumentTotals(updatedRegels);
  
  await docRef.update({
    regels: updatedRegels,
    totaal_subtotaal_excl_btw: subtotal,
    totaal_btw_bedrag: vat,
    totaal_incl_btw: total,
  });
}

export async function deleteDocumentLine(documentId: string, lineId: string) {
    if (!isAdminSdkInitialized) {
      throw new Error("Firebase not configured. Cannot delete document line in offline mode.");
    }

    const docRef = adminDb.collection('documenten').doc(documentId);
    const doc = await docRef.get();
    if (!doc.exists) throw new Error("Document not found.");

    const currentRegels = doc.data()?.regels || [];
    const updatedRegels = currentRegels.filter((r: DocumentLine) => r.id !== lineId);

    const { subtotal, vat, total } = recalculateDocumentTotals(updatedRegels);

    await docRef.update({
        regels: updatedRegels,
        totaal_subtotaal_excl_btw: subtotal,
        totaal_btw_bedrag: vat,
        totaal_incl_btw: total,
    });
}


// --- Article Data ---

export async function getArticles(): Promise<Article[]> {
    if (!isAdminSdkInitialized) {
        console.warn("Firebase not configured. Using mock data for articles.");
        return JSON.parse(JSON.stringify(mockDb.articles)).sort((a: Article, b: Article) => a.artikel_naam.localeCompare(b.artikel_naam));
    }
    try {
        const snapshot = await adminDb.collection('artikelen').orderBy('artikel_naam').get();
        if (snapshot.empty) return [];
        return snapshot.docs.map(doc => serialize<Article>(doc));
    } catch (error: any) {
        if (isDatastoreModeError(error)) {
            logDatastoreModeError();
            return JSON.parse(JSON.stringify(mockDb.articles)).sort((a: Article, b: Article) => a.artikel_naam.localeCompare(b.artikel_naam));
        }
        console.error("Error fetching articles:", error);
        return [];
    }
}

export async function getArticleById(id: string): Promise<Article | null> {
    if (!isAdminSdkInitialized) {
        console.warn(`Firebase not configured. Using mock data for getArticleById(${id}).`);
        const article = mockDb.articles.find(a => a.id === id);
        return article ? JSON.parse(JSON.stringify(article)) : null;
    }
    try {
        const doc = await adminDb.collection('artikelen').doc(id).get();
        if (!doc.exists) return null;
        return serialize<Article>(doc);
    } catch (error: any) {
        if (isDatastoreModeError(error)) {
            logDatastoreModeError();
            const article = mockDb.articles.find(a => a.id === id);
            return article ? JSON.parse(JSON.stringify(article)) : null;
        }
        console.error(`Error fetching article ${id}:`, error);
        return null;
    }
}

export async function addArticle(articleData: Omit<Article, 'id'>): Promise<Article> {
    if (!isAdminSdkInitialized) {
        throw new Error("Firebase not configured. Cannot add article in offline mode.");
    }
    const docRef = await adminDb.collection('artikelen').add(articleData);
    return { id: docRef.id, ...articleData };
}

export async function updateArticle(id: string, articleData: Partial<Omit<Article, 'id'>>): Promise<Article> {
    if (!isAdminSdkInitialized) {
        throw new Error("Firebase not configured. Cannot update article in offline mode.");
    }
    const docRef = adminDb.collection('artikelen').doc(id);
    await docRef.update(articleData);
    const updatedDoc = await docRef.get();
    return serialize<Article>(updatedDoc);
}

export async function deleteArticle(id: string): Promise<void> {
    if (!isAdminSdkInitialized) {
        throw new Error("Firebase not configured. Cannot delete article in offline mode.");
    }
    await adminDb.collection('artikelen').doc(id).delete();
}
