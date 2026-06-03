interface CreateItemInput {
  title: string;
  description: string;
}

export function parseCreateItemInput(value: unknown): CreateItemInput {
  if (!isRecord(value)) {
    throw new Error('Invalid JSON body');
  }

  const title = typeof value.title === 'string' ? value.title.trim() : '';
  const description = typeof value.description === 'string' ? value.description.trim() : '';

  if (title.length < 3) {
    throw new Error('Title must be at least 3 characters');
  }
  if (title.length > 120) {
    throw new Error('Title must be 120 characters or fewer');
  }
  if (typeof value.description !== 'undefined' && typeof value.description !== 'string') {
    throw new Error('Description must be a string');
  }
  if (description.length > 4000) {
    throw new Error('Description must be 4000 characters or fewer');
  }

  return { title, description };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
