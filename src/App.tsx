import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProfileProvider } from "./state/ProfileProvider";
import Nav from "./components/Nav";
import Dashboard from "./pages/Dashboard";
import Algorithms from "./pages/Algorithms";
import TrainerCross from "./pages/TrainerCross";
import Library from "./pages/Library";
import Notation from "./pages/Notation";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <ProfileProvider>
      <BrowserRouter>
        <Nav />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/algorithms/*" element={<Algorithms />} />
          <Route path="/trainer" element={<TrainerCross />} />
          <Route path="/library/*" element={<Library />} />
          <Route path="/notation" element={<Notation />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ProfileProvider>
  );
}
