'use client';

import './globals.css';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { MessageSquare, Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className='border-b border-border'>
          <div className='px-4 py-3 flex items-center gap-3'>
            <Image
              src='/logo.svg'
              alt='Apollo Logo'
              width={32}
              height={32}
              className='shrink-0'
            />
            <h2 className='text-lg font-semibold'>Apollo</h2>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/'}>
                <Link href='/'>
                  <MessageSquare className='h-4 w-4' />
                  <span>Chat</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith('/admin')}
              >
                <Link href='/admin'>
                  <Settings className='h-4 w-4' />
                  <span>Admin Panel</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className='flex h-14 items-center gap-4 border-b border-border px-4'>
          <SidebarTrigger />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' className='dark'>
      <head>
        <title>Apollo</title>
        <meta name='description' content='Apollo AI Chatbot' />
        <link rel='icon' href='/logo.svg' type='image/svg+xml' />
      </head>
      <body className='font-sans antialiased'>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
