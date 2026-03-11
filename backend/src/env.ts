import dotenv from "dotenv";
dotenv.config();

export const PORT = Number(process.env.PORT || 8000);
export const HOST = process.env.HOST || "0.0.0.0";
export const WORKSTATION_URL = process.env.WORKSTATION_URL || "http://jarvis:8000";
export const PI_URL = process.env.PI_URL || "http://jarvis-pi:5000";
export const PI_API_TOKEN = process.env.PI_API_TOKEN || "replace-me --- IGNORE ---";
