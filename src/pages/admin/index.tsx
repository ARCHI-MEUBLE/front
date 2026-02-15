import type { GetServerSideProps } from 'next';
import { hasAdminSession } from '@/lib/adminAuth';
import { adminUrl } from '@/lib/adminPath';

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const destination = hasAdminSession(req.headers.cookie)
    ? adminUrl('/dashboard')
    : adminUrl('/login');

  return {
    redirect: {
      destination,
      permanent: false,
    },
  };
};

export default function AdminIndex() {
  return null;
}