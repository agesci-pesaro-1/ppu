import { createRemoteJWKSet, jwtVerify } from 'jose';

// Un JWKS per team, riusato tra le richieste dello stesso isolate.
const jwks = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

/**
 * Verifica il JWT di Cloudflare Access (header Cf-Access-Jwt-Assertion) e
 * restituisce l'email. Firma, emittente, audience e scadenza sono controllati.
 */
export async function emailDaAccess(
  request: Request,
  access: { teamDomain: string; aud: string },
): Promise<string | null> {
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return null;
  const emittente = `https://${access.teamDomain}`;
  let chiavi = jwks.get(emittente);
  if (!chiavi) {
    chiavi = createRemoteJWKSet(new URL(`${emittente}/cdn-cgi/access/certs`));
    jwks.set(emittente, chiavi);
  }
  try {
    const { payload } = await jwtVerify(token, chiavi, {
      issuer: emittente,
      audience: access.aud,
    });
    return typeof payload.email === 'string' ? payload.email : null;
  } catch {
    return null;
  }
}
