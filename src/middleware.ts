import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_PATH = process.env.NEXT_PUBLIC_ADMIN_PATH;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bloquer l'acces direct a /admin/* (pages uniquement, pas /api/admin/*)
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return new NextResponse(null, { status: 404 });
  }

  // Rewriter /{SECRET_PATH}/* vers /admin/*
  if (ADMIN_PATH && (pathname === `/${ADMIN_PATH}` || pathname.startsWith(`/${ADMIN_PATH}/`))) {
    const subPath = pathname.slice(`/${ADMIN_PATH}`.length);
    const adminPath = subPath ? `/admin${subPath}` : '/admin';

    const url = request.nextUrl.clone();
    url.pathname = adminPath;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|images|uploads|models|textures|fonts|backend).*)',
  ],
};
