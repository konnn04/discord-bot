import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { Toaster } from "@/components/ui/sonner"
import { QUERY_DEFAULTS } from "@/lib/config"
import { App } from "./App.tsx"

import "./index.css"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: QUERY_DEFAULTS,
  },
})

// Set title, favicon, and metadata 
document.title = "Discord Bot Dashboard"
const favicon = document.getElementById("favicon") as HTMLLinkElement | null
if (favicon) {
  favicon.href = "/favicon.ico"
}
const metaDescription = document.querySelector('meta[name="description"]')
if (metaDescription) {
  metaDescription.setAttribute(
    "content",
    "Dashboard quản lý bot Discord của bạn với các tính năng như thống kê, quản lý thành viên, và cài đặt tùy chỉnh."
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <App />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
)
