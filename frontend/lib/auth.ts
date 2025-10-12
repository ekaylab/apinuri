import { cookies } from 'next/headers';
import { cache } from 'react';
import { apiFetch } from '@/utils/fetch';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export const getUser = cache(async (): Promise<User | null> => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const data = await apiFetch('/auth/me', {
      headers: {
        Cookie: `session=${sessionCookie}`,
      },
    });

    if (data.user) {
      return data.user;
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
});