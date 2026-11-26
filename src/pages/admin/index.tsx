import type { GetServerSideProps } from 'next';
import { verifyAdminSession } from '@/lib/adminAuth';
import { serverAdminUrl } from '@/lib/adminPathServer';

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const destination = (await verifyAdminSession(req, res))
    ? serverAdminUrl('/dashboard')
    : serverAdminUrl('/login');

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