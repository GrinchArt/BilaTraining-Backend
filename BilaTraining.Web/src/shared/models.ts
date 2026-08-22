export type Client = {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  relationshipStatus: CoachClientRelationshipStatus;
  isLinked: boolean;
};

export type CoachClientRelationshipStatus = 0 | 1 | 2 | 3 | 4;

export type InvitationPreview = {
  coachName: string;
  clientName: string;
  expiresAtUtc: string;
};

export type ClientRelationship = {
  id: string;
  clientId: string;
  coachName: string;
  status: CoachClientRelationshipStatus;
  startedAtUtc: string | null;
};

export type ClientDashboardSession = {
  id: string;
  relationshipId: string;
  coachName: string;
  workspaceName: string;
  startAtUtc: string;
  endAtUtc: string;
  status: SessionStatus;
  notes: string | null;
};

export type ClientDashboard = {
  relationships: ClientRelationship[];
  sessions: ClientDashboardSession[];
};

export type BodyMeasurement = {
  id: string;
  recordedOn: string;
  weightKg: number | null;
  heightCm: number | null;
  bodyFatPercent: number | null;
  neckCm: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  bicepsCm: number | null;
  thighCm: number | null;
  calfCm: number | null;
  notes: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
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

export type SessionExercise = {
  id: string;
  sessionId: string;
  exerciseId: string;
  sortOrder: number;
  notes: string | null;
  createdAtUtc: string;
};

export type SessionExerciseSet = {
  id: string;
  sessionExerciseId: string;
  setNumber: number;
  repetitions: number | null;
  weight: number | null;
  weightUnit: string | null;
  notes: string | null;
};

export type ReportPeriod = 'week' | 'month';

export type SessionOverviewPeriod = {
  period: ReportPeriod;
  anchorDate: string;
  startDate: string;
  endDate: string;
  previousAnchorDate: string;
  nextAnchorDate: string;
  timeZone: string;
};

export type SessionOverviewSummary = {
  total: number;
  planned: number;
  completed: number;
  cancelled: number;
  noShow: number;
};

export type SessionOverviewStatus = {
  status: SessionStatus;
  count: number;
};

export type SessionOverviewTimelinePoint = {
  date: string;
  total: number;
  planned: number;
  completed: number;
  cancelled: number;
  noShow: number;
};

export type SessionOverviewReport = {
  period: SessionOverviewPeriod;
  summary: SessionOverviewSummary;
  byStatus: SessionOverviewStatus[];
  timeline: SessionOverviewTimelinePoint[];
};

export type ExerciseProgressSummary = {
  completedSessions: number;
  totalSets: number;
  totalRepetitions: number;
  totalVolume: number;
  maxWeight: number;
};

export type ExerciseProgressTimelinePoint = {
  date: string;
  completedSessions: number;
  totalSets: number;
  totalRepetitions: number;
  totalVolume: number;
  maxWeight: number;
};

export type ExerciseProgressReport = {
  period: SessionOverviewPeriod;
  summary: ExerciseProgressSummary;
  timeline: ExerciseProgressTimelinePoint[];
};
