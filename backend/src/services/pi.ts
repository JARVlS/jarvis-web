import { PI_API_TOKEN, PI_URL } from "../env.js";

async function post(path: string) {
  const response = await fetch(`${PI_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${PI_API_TOKEN}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pi request failed: ${response.status} ${text}`);
  }

  return response.json();
}

export async function getPiStatus() {
  const response = await fetch(`${PI_URL}/status`, {
    headers: {
      "Authorization": `Bearer ${PI_API_TOKEN}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pi status failed: ${response.status} ${text}`);
  }

  return response.json();
}

export function wakeWorkstation() {
  return post("/wake");
}

export function sleepWorkstation() {
  return post("/sleep");
}

export function shutdownWorkstation() {
  return post("/shutdown");
}