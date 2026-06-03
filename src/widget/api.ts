import type { BoardItemView } from './types';

interface EventUpdate {
  cursor: number;
  events: Array<{ id: number; itemId: string | null; eventType: string }>;
}

export class BoardApi {
  constructor(
    private readonly apiUrl: string,
    private readonly boardId: string,
    private readonly getToken: () => Promise<string>
  ) {}

  async listItems(): Promise<BoardItemView[]> {
    const res = await fetch(`${this.apiUrl}/boards/${this.boardId}/items`, {
      headers: { Authorization: `Bearer ${await this.getToken()}` },
    });
    if (!res.ok) {
      throw new Error(await responseError(res));
    }
    const data = (await res.json()) as { items: BoardItemView[] };
    return data.items;
  }

  async createItem(input: { title: string; description: string }): Promise<BoardItemView> {
    const res = await fetch(`${this.apiUrl}/boards/${this.boardId}/items`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await this.getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      throw new Error(await responseError(res));
    }
    const data = (await res.json()) as { item: BoardItemView };
    return data.item;
  }

  async toggleUpvote(itemId: string): Promise<BoardItemView> {
    const res = await fetch(`${this.apiUrl}/boards/${this.boardId}/items/${itemId}/upvote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await this.getToken()}` },
    });
    if (!res.ok) {
      throw new Error(await responseError(res));
    }
    const data = (await res.json()) as { item: BoardItemView };
    return data.item;
  }

  async events(since: number): Promise<EventUpdate> {
    const res = await fetch(`${this.apiUrl}/boards/${this.boardId}/events?since=${since}`, {
      headers: { Authorization: `Bearer ${await this.getToken()}` },
    });
    if (!res.ok) {
      throw new Error(await responseError(res));
    }
    return (await res.json()) as EventUpdate;
  }
}

async function responseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? `Request failed with ${res.status}`;
  } catch {
    return `Request failed with ${res.status}`;
  }
}
