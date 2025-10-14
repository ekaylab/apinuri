import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { Header } from '@/components/Header';
import MyApisList from './MyApisList';

export default async function Page() {
  const user = await getUser();

  if (!user) {
    redirect('/signin');
  }

  return (
    <>
      <Header />
      <MyApisList />
    </>
  );
}
