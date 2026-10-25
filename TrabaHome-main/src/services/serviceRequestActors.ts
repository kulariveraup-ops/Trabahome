type ServiceRequestActor = {
  id?: unknown;
  role?: unknown;
  avatar?: unknown;
};

type ServiceRequestListResponse = {
  items?: unknown[];
  actors?: ServiceRequestActor[];
  [key: string]: unknown;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? value as Record<string, unknown> : {};

export const hydrateServiceRequestActors = <T extends ServiceRequestListResponse>(response: T): T => {
  const avatarByActor = new Map<string, string>();
  (Array.isArray(response.actors) ? response.actors : []).forEach((actor) => {
    const id = String(actor?.id || '').trim();
    const role = String(actor?.role || '').trim().toLowerCase();
    const avatar = String(actor?.avatar || '').trim();
    if (id && role && avatar) avatarByActor.set(`${role}:${id}`, avatar);
  });

  const items = (Array.isArray(response.items) ? response.items : []).map((value) => {
    const item = asRecord(value);
    const homeownerId = String(item.homeownerId || '').trim();
    const workerId = String(item.targetWorkerId || item.workerId || '').trim();
    return {
      ...item,
      homeownerAvatar: String(item.homeownerAvatar || avatarByActor.get(`homeowner:${homeownerId}`) || ''),
      workerAvatar: String(item.workerAvatar || avatarByActor.get(`worker:${workerId}`) || ''),
    };
  });

  return { ...response, items };
};

export const applyServiceRequestActors = (
  items: unknown[],
  actors: unknown[] | undefined
): unknown[] => hydrateServiceRequestActors({ items, actors: actors as ServiceRequestActor[] | undefined }).items || [];
