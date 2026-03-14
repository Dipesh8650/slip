import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { I18nProvider } from "./i18n/context";
import { Footer } from "./components/Footer";
import { NotePage } from "./pages/NotePage";
import { RedirectPage } from "./pages/RedirectPage";

export function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <main className="flex-1">
<Routes>
            <Route path="/" element={<RedirectPage />} />
            <Route path="/v/:slug" element={<NotePage readOnly />} />
            <Route path="/:slug" element={<NotePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </I18nProvider>
  );
}
