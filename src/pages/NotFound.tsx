import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-4">Not found</h1>
      <Link to="/" className="text-blue-600 underline">
        Back to dashboard
      </Link>
    </main>
  );
}
