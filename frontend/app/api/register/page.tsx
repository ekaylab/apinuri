import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import RegisterForm from './RegisterForm';

export default async function RegisterApiPage() {
  const user = await getUser();

  if (!user) {
    redirect('/signin');
  }

  return <RegisterForm />;
}