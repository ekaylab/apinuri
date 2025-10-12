import Link from 'next/link';
import { getUser } from '@/lib/auth';

export async function Header() {
  const user = await getUser();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <span className="text-xl font-semibold text-black">API누리</span>
          </Link>

          {/* Navigation & Auth Section */}
          <div className="flex items-center gap-8">
            {/* Navigation Menu */}
            {user && (
              <nav className="flex items-center gap-8">
                <Link
                  href="/api/register"
                  className="text-sm text-gray-600 hover:text-black transition-colors"
                >
                  API 등록
                </Link>
              </nav>
            )}

            {/* Auth Section */}
            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-3">
                  {user.avatar_url && (
                    <img
                      src={user.avatar_url}
                      alt={user.name || user.email}
                      className="w-7 h-7 rounded-full border border-gray-200"
                    />
                  )}
                  <span className="text-sm text-black">
                    {user.name || user.email}
                  </span>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-1.5 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 transition-colors"
                >
                  로그인
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}