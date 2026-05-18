import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProfileProvider } from "./state/ProfileProvider";
import Nav from "./components/Nav";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Trainer from "./pages/Trainer";
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
          <Route path="/profile" element={<Profile />} />
          <Route path="/trainer/*" element={<Trainer />} />
          <Route path="/library/*" element={<Library />} />
          <Route path="/notation" element={<Notation />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ProfileProvider>
  );
}
