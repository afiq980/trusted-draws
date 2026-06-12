export type EntryFormat = 'username' | 'email' | 'phone' | 'custom' | 'free-text';
export type UniquenessRule = 'unique' | 'duplicates_allowed';
export type DrawStatus = 'draft' | 'open' | 'closed' | 'drawn' | 'published' | 'archived';

export interface Draw {
  id: string;
  publicId: string;
  adminToken: string;
  title: string;
  description?: string;
  organizerName?: string;
  organizerEmail?: string;
  entryFormat: EntryFormat;
  uniquenessRule: UniquenessRule;
  numWinners: number;
  allowWeighted: boolean;
  settings: Record<string, unknown>;
  verificationKey: string;
  status: DrawStatus;
  entryStartAt?: string;
  entryEndAt?: string;
  drawAt?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Entry {
  id: string;
  drawId: string;
  entryText: string;
  entryHash: string;
  weight: number;
  email?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface DrawResult {
  id: string;
  drawId: string;
  entryId: string;
  position: number;
  winnerHash: string;
  selectedAt: string;
  createdAt: string;
}
