import type { GetServerSideProps } from 'next';
import { hasAdminSession } from '@/lib/adminAuth';

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const destination = hasAdminSession(req.headers.cookie)
    ? '/admin/dashboard'
    : '/admin/login';

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