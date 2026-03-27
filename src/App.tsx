import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import TextInputPage from "./components/text/TextInputPage";
import VocabPage from "./components/vocab/VocabPage";
import ReviewEntryPage from "./components/review/ReviewEntryPage";
import SettingsPage from "./components/settings/SettingsPage";

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <h2 className="text-2xl font-bold text-gray-400">{title}</h2>
    </div>
  );
}

function StatsPage() {
  return <PlaceholderPage title="学习统计" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<TextInputPage />} />
          <Route path="/vocab" element={<VocabPage />} />
          <Route path="/review" element={<ReviewEntryPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
