import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import TextInputPage from "./components/text/TextInputPage";

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <h2 className="text-2xl font-bold text-gray-400">{title}</h2>
    </div>
  );
}

function VocabPage() {
  return <PlaceholderPage title="我的词库" />;
}

function ReviewPage() {
  return <PlaceholderPage title="今日复习" />;
}

function StatsPage() {
  return <PlaceholderPage title="学习统计" />;
}

function SettingsPage() {
  return <PlaceholderPage title="设置" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<TextInputPage />} />
          <Route path="/vocab" element={<VocabPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
