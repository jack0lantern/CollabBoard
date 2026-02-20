export interface PresenceData {
  cursor: { x: number; y: number } | null;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
  lastSeen: number;
}
