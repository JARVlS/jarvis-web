import dotenv from "dotenv";
dotenv.config();

export const PORT = Number(process.env.PORT || 8000);
export const HOST = process.env.HOST || "0.0.0.0";
export const WORKSTATION_URL = process.env.WORKSTATION_URL || "http://jarvis:8000";
