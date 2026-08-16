interface TokenResponse {
  token?: unknown;
}

export async function fetchBoardToken(tokenEndpoint: string): Promise<string> {
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: '{}',
  });

  if (!response.ok) {
    throw new Error(`Token request failed with ${response.status}`);
  }

  let data: TokenResponse;
  try {
    data = (await response.json()) as TokenResponse;
  } catch {
    throw new Error('Token request returned invalid JSON');
  }

  if (typeof data.token !== 'string' || data.token.trim().length === 0) {
    throw new Error('Token request did not return a token');
  }

  return data.token;
}
