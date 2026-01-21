import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Link
            href="/api/auth/signout"
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Sign Out
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Protected Content</h2>
          <p className="text-gray-600 dark:text-gray-300">
            This is a protected route. Only authenticated users can see this
            content.
          </p>
          {session.user && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">
                Logged in as: {session.user.email || session.user.name}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
