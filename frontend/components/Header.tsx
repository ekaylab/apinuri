import Link from 'next/link';

export async function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <span className="text-xl font-semibold text-black">API누리</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-8">
            <Link
              href="/api/register"
              className="text-sm text-gray-600 hover:text-black transition-colors"
            >
              API 등록
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}