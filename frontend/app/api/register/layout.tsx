import { Header } from '@/components/Header';

export default async function RegisterApiLayout({
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