import { SessionProvider } from 'next-auth/react';
import { IgniterProvider } from '@/providers/IgniterProvider';
import { TokenTimeoutProvider } from '@/providers/TokenTimeoutProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function RootLayoutWithTimeout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minuto
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <html lang="pt-BR">
      <body>
        <SessionProvider>
          <QueryClientProvider client={queryClient}>
            <IgniterProvider>
              <TokenTimeoutProvider>{children}</TokenTimeoutProvider>
            </IgniterProvider>
          </QueryClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
