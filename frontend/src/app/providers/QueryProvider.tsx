import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren, useState } from "react";

export function QueryProvider({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { retry: 2, refetchOnWindowFocus: false, staleTime: 30000 },
    },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
