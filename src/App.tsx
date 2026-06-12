import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProfileProvider } from "./state/ProfileProvider";
import Nav from "./components/Nav";
import Algorithms from "./pages/Algorithms";
import Trainer from "./pages/Trainer";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <ProfileProvider>
      <BrowserRouter>
        <Nav />
        <Routes>
          <Route path="/" element={<Navigate to="/algorithms" replace />} />
          <Route path="/algorithms/*" element={<Algorithms />} />
          <Route path="/trainer/*" element={<Trainer />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ProfileProvider>
  );
}
