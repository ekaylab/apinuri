import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import RegisterFormNew from './RegisterFormNew';

export default async function RegisterApiPage() {
  const user = await getUser();

  if (!user) {
    redirect('/signin');
  }

  return <RegisterFormNew />;
}