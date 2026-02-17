function getProjectId() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID is required for E2E Firestore setup."
    );
  }
  return projectId;
}

function toFirestoreValue(value: unknown): Record<string, unknown> {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === "object") {
    const fields: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>
    )) {
      fields[key] = toFirestoreValue(nestedValue);
    }
    return { mapValue: { fields } };
  }

  return { stringValue: String(value) };
}

function toFields(data: Record<string, unknown>) {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    fields[key] = toFirestoreValue(value);
  }
  return fields;
}

function getFirestoreBase() {
  const projectId = getProjectId();
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

export async function createTestBoard(params: {
  token: string;
  ownerUid: string;
  titlePrefix?: string;
  isPublic?: boolean;
}): Promise<string> {
  const { token, ownerUid, titlePrefix = "e2e-board", isPublic = true } = params;
  const boardId = `${titlePrefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const firestoreBase = getFirestoreBase();

  const res = await fetch(`${firestoreBase}/boards/${boardId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: toFields({
        title: boardId,
        owner_id: ownerUid,
        created_at: new Date(),
        last_snapshot: null,
        is_public: isPublic,
        shared_with: {},
      }),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create board (${res.status}): ${body}`);
  }

  return boardId;
}

export async function deleteBoardDoc(params: {
  token: string;
  boardId: string;
}) {
  const { token, boardId } = params;
  const firestoreBase = getFirestoreBase();
  await fetch(`${firestoreBase}/boards/${boardId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
