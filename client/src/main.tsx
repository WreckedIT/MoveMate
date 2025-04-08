import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./components/ui/theme-provider";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

// Add debug logging for API requests
console.log("[DEBUG] Application starting up");

// Test the API connection
fetch('/api/owners')
  .then(response => {
    console.log("[DEBUG] API connection test response:", response.status, response.statusText);
    return response.json();
  })
  .then(data => {
    console.log("[DEBUG] API data:", data);
  })
  .catch(error => {
    console.error("[DEBUG] API connection error:", error);
  });

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="light" storageKey="box-tracker-theme">
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </ThemeProvider>
);
