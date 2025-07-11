
export type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  status: 'Lead' | 'Active' | 'Inactive';
  createdAt: string; // ISO string
  notes: string;
};

export type Company = {
  name: string;
  logoUrl: string;
  address: string;
  phone: string;
  email: string;
  website: string;
};

export type DocumentLine = {
  id: string; // A unique ID for the line item itself
  artikel_id: string;
  omschrijving: string;
  aantal: number;
  eenheid: string;
  prijs_per_eenheid_excl_btw: number;
  btw_percentage: number;
  korting_percentage: number;
  totaal_excl_btw: number;
};

export type Document = {
  id: string;
  klant_id: string;
  clientName: string; // For display convenience, joined from clients collection
  document_type: 'Quote' | 'Work Order' | 'Invoice';
  document_nummer: string;
  document_datum: string; // ISO string
  document_status: 'concept' | 'Draft' | 'Sent' | 'Paid';
  regels: DocumentLine[];
  totaal_subtotaal_excl_btw: number;
  totaal_btw_bedrag: number;
  totaal_incl_btw: number;
};

export type ArticlePhoto = {
  foto_url: string;
  foto_omschrijving: string;
};

export type Article = {
  id: string;
  artikel_naam: string;
  artikel_omschrijving_kort: string;
  artikel_omschrijving_lang: string;
  artikel_fotos: ArticlePhoto[];
  artikel_urls: string[];
  artikel_magazijnlocatie: string;
  artikel_prijs_excl_btw: number;
  artikel_korting_percentage: number;
  artikel_btw_percentage: number;
  artikel_eenheid: string;
};
