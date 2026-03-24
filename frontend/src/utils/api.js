const API_BASE = 'http://localhost:8000';

export async function createSession(candidateName) {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidate_name: candidateName })
  });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

export async function getSessions() {
  const res = await fetch(`${API_BASE}/sessions`);
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
}

export async function getSessionDetail(id) {
  const res = await fetch(`${API_BASE}/sessions/${id}`);
  if (!res.ok) throw new Error('Failed to fetch session detail');
  return res.json();
}

export async function endSession(id) {
  const res = await fetch(`${API_BASE}/sessions/${id}/end`, {
    method: 'PATCH'
  });
  if (!res.ok) throw new Error('Failed to end session');
  return res.json();
}
