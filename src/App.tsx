import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Toast from "./components/Toast";
import TextInputPage from "./components/text/TextInputPage";
import VocabPage from "./components/vocab/VocabPage";
import ReviewEntryPage from "./components/review/ReviewEntryPage";
import SettingsPage from "./components/settings/SettingsPage";
import StatsPage from "./components/stats/StatsPage";

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
      <Toast />
    </BrowserRouter>
  );
}

export default App;
