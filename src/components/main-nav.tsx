"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Users, FileText, Building, Wand2, Package } from "lucide-react";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";

const navItems = [
  { href: "/clients", label: "Clients", icon: Users, exact: false },
  { href: "/documents", label: "Documents", icon: FileText, exact: false },
  { href: "/articles", label: "Articles", icon: Package, exact: false },
  { href: "/suggest-rule", label: "Suggest Rule", icon: Wand2, exact: true },
  { href: "/profile", label: "Company Profile", icon: Building, exact: true },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav>
      <SidebarMenu>
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </nav>
  );
}
