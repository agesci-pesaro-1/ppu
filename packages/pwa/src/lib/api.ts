// Client of the Worker's REST API (same origin). No personal data is stored in
// the browser: every piece of data comes from the network on every opening.
// Error messages are shown to the user (Italian).

export interface Me {
  group: string;
  environment: string;
  testMode: boolean;
  email: string;
  units: string[];
  roles: {
    fullAccess: boolean;
    buonaStrada: boolean;
    webmaster: boolean;
    betaTester: boolean;
  };
  memberId: number | null;
}

export interface Unit {
  id: string;
  name: string;
  branch: string;
  members: number;
}

export interface ListEntry {
  id: number;
  lastName: string;
  firstName: string;
  unit: { id: string; name: string } | null;
  birthYear: number | null;
  age: number | null;
  status: 'attivo' | 'archiviato';
  tags: string[];
}

export interface MemberCard {
  id: number;
  censusCode: string | null;
  lastName: string;
  firstName: string;
  birthDate: string | null;
  birthPlace: string | null;
  age: number | null;
  unit: { id: string; name: string } | null;
  status: 'attivo' | 'archiviato';
  isLeader: boolean;
  contacts: { mobile: string | null; email: string | null; receivesCommunications: boolean };
  privacy: {
    privacyNotice: boolean;
    privacyNoticeDate: string | null;
    consent2a: boolean;
    consent2b: boolean;
    consent2c: boolean;
    notes: string | null;
  };
  guardians: {
    id: number;
    role: string;
    lastName: string;
    firstName: string;
    mobile: string | null;
    email: string | null;
    linkedMemberId: number | null;
  }[];
  relationships: { type: string; memberId: number; lastName: string; firstName: string }[];
  tags: { name: string; type: string }[];
  progression: { date: string | null; type: string | null; description: string | null }[];
  attendance: {
    counts: { presente: number; assente: number; giustificato: number };
    latest: {
      date: string;
      type: string;
      unit: string;
      status: string;
      reason: string | null;
    }[];
  };
  unitHistory: { year: string; unit: string }[];
  canEdit: boolean;
}

export interface DemoUser {
  email: string;
  label: string;
  description: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string): Promise<T> {
  let r: Response;
  try {
    r = await fetch(path, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new ApiError(0, 'network', 'Connessione non disponibile.');
  }
  if (!r.ok) {
    let code = 'error';
    let message = `Errore ${r.status}`;
    try {
      const body = (await r.json()) as { error?: { code?: string; message?: string } };
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
    } catch {
      // not a JSON answer (e.g. the Access page)
    }
    throw new ApiError(r.status, code, message);
  }
  return (await r.json()) as T;
}

export const api = {
  me: () => request<Me>('/api/me'),
  units: () => request<Unit[]>('/api/units'),
  members: (filters: { q?: string; unit?: string }) => {
    const p = new URLSearchParams();
    if (filters.q) p.set('q', filters.q);
    if (filters.unit) p.set('unit', filters.unit);
    const qs = p.toString();
    return request<ListEntry[]>(`/api/members${qs ? `?${qs}` : ''}`);
  },
  member: (id: number) => request<MemberCard>(`/api/members/${id}`),
  demoUsers: () => request<DemoUser[]>('/api/demo/users'),
};

// Test mode (preview and local only): the Worker sets an HttpOnly cookie with
// the chosen user, and accepts it only in that mode.
async function postDemo(path: string, body: unknown): Promise<void> {
  const r = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new ApiError(r.status, 'demo', 'Impossibile cambiare utente.');
}

export const pickTestUser = (email: string) => postDemo('/api/demo/login', { email });
export const leaveTestUser = () => postDemo('/api/demo/logout', {});
