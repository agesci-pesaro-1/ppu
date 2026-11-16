import { createRemoteJWKSet, jwtVerify } from 'jose';

// One JWKS per team, reused across requests in the same isolate.
const jwks = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

/**
 * Verifies the Cloudflare Access JWT (Cf-Access-Jwt-Assertion header) and
 * returns the email. Signature, issuer, audience and expiry are checked.
 */
export async function emailFromAccess(
  request: Request,
  access: { teamDomain: string; aud: string },
): Promise<string | null> {
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return null;
  const issuer = `https://${access.teamDomain}`;
  let keys = jwks.get(issuer);
  if (!keys) {
    keys = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    jwks.set(issuer, keys);
  }
  try {
    const { payload } = await jwtVerify(token, keys, {
      issuer,
      audience: access.aud,
    });
    return typeof payload.email === 'string' ? payload.email : null;
  } catch {
    return null;
  }
}
