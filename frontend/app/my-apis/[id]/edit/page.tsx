import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import EditApiForm from './EditApiForm';

export default async function EditApiPage({ params }: { params: { id: string } }) {
  const user = await getUser();

  if (!user) {
    redirect('/signin');
  }

  return <EditApiForm apiId={params.id} />;
}