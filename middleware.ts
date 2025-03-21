import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the auth storage from cookies
  const authStorage = request.cookies.get('auth-storage');
  const authToken = request.cookies.get('auth-token');
  let isAuthenticated = false;

  // Check if auth storage exists and contains a token
  if (authStorage) {
    try {
      const authData = JSON.parse(authStorage.value);
      isAuthenticated = !!(authData.state && authData.state.token);
    } catch (error) {
      console.error('Error parsing auth storage:', error);
    }
  }

  // Also check for auth token cookie as fallback
  if (!isAuthenticated && authToken) {
    isAuthenticated = true;
  }

  const isAuthPage =
    request.nextUrl.pathname === '/auth/signin' ||
    request.nextUrl.pathname === '/auth/signup';

  // Debug logs
  console.log('Middleware check:', {
    path: request.nextUrl.pathname,
    isAuthenticated,
    isAuthPage,
    hasAuthStorage: !!authStorage,
    hasAuthToken: !!authToken
  });

  if (!isAuthenticated && !isAuthPage && request.nextUrl.pathname !== '/') {
    console.log('Redirecting to signin...');
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  if (isAuthenticated && isAuthPage) {
    console.log('Redirecting to dashboard...');
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}; 