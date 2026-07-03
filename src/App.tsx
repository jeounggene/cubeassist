import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProfileProvider } from "./state/ProfileProvider";
import Nav from "./components/Nav";
import Algorithms from "./pages/Algorithms";
import Trainer from "./pages/Trainer";
import TimerPage from "./pages/TimerPage";
import TrainingPlan from "./pages/TrainingPlan";
import Coach from "./pages/Coach";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <ProfileProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Nav />
        <Routes>
          <Route path="/" element={<Navigate to="/plan" replace />} />
          <Route path="/plan" element={<TrainingPlan />} />
          <Route path="/algorithms/*" element={<Algorithms />} />
          <Route path="/trainer/*" element={<Trainer />} />
          <Route path="/timer" element={<TimerPage />} />
          <Route path="/coach" element={<Coach />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ProfileProvider>
  );
}
