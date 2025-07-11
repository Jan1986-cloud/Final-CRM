import { getCompany } from "@/backend/lib/data";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Phone, MapPin, Globe } from "lucide-react";

export default async function ProfilePage() {
  const company = await getCompany();

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Company Profile" />
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <Card className="mx-auto max-w-3xl">
          <CardHeader className="items-center text-center">
            <Avatar className="h-24 w-24">
              <AvatarImage src={company.logoUrl} alt={company.name} data-ai-hint="logo" />
              <AvatarFallback>{company.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <CardTitle className="pt-4 font-headline text-3xl">{company.name}</CardTitle>
          </CardHeader>
          <CardContent className="mt-4 space-y-6 border-t pt-6">
             <div className="flex items-center gap-4">
              <Globe className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {company.website}
              </a>
            </div>
            <div className="flex items-center gap-4">
              <Mail className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <a href={`mailto:${company.email}`} className="hover:underline">
                {company.email}
              </a>
            </div>
            <div className="flex items-center gap-4">
              <Phone className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <span>{company.phone}</span>
            </div>
            <div className="flex items-start gap-4">
              <MapPin className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <p>{company.address}</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
