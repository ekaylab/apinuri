import { Header } from '@/components/Header';
import PublicApisList from './PublicApisList';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <PublicApisList />
    </div>
  );
}
