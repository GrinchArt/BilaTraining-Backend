export type Client = {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

export type Exercise = {
  id: string;
  name: string;
  category: string | null;
  notes: string | null;
};

export type Workspace = {
  id: string;
  name: string;
  description: string | null;
  colorHex: string | null;
};

export type SessionStatus = 0 | 1 | 2 | 3;

export type Session = {
  id: string;
  workspaceId: string;
  clientId: string;
  notes: string | null;
  startAtUtc: string;
  endAtUtc: string;
  status: SessionStatus;
};
