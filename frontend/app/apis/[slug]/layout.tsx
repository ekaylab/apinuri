import { Header } from '@/components/Header';

export default async function ApiDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      {children}
    </div>
  );
}