import { jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export interface TokenPayload {
  sub: string; // student.id
  external_id: string;
  first_name: string;
  family_id: string;
  iat: number;
  exp: number;
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export async function getAuthFromRequest(request: NextRequest): Promise<TokenPayload | null> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  return verifyToken(token);
}

export function unauthorizedResponse(message = 'No autorizado') {
  return Response.json({ error: message }, { status: 401 });
}
