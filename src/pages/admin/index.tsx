import type { GetServerSideProps } from 'next';
import { verifyAdminSession } from '@/lib/adminAuth';
import { adminUrl } from '@/lib/adminPath';

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const destination = (await verifyAdminSession(req, res))
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