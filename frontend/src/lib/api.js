import axios from "axios";
import { auth } from "@/lib/firebase";

// 1. Ensure the URL is correctly constructed.
// We keep the /api prefix here because your backend router uses prefix="/api"
const BACKEND_URL =
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  "https://staggerinn.onrender.com";
export const API = `${BACKEND_URL}/api`;

export const apiClient = axios.create({ baseURL: API });

apiClient.interceptors.request.use(async (config) => {
  const token = auth.currentUser
    ? await auth.currentUser.getIdToken()
    : localStorage.getItem("cabin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("cabin_token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export const CABINS = ["Homestead & Bunkie", "PinePoint", "Cedar Grove", "Sugar Shack"];

export const CABIN_TAGS = {
  "Homestead & Bunkie": "H&B",
  "PinePoint": "PP",
  "Cedar Grove": "CG",
  "Sugar Shack": "SS",
};

export const CABIN_STYLES = {
  "Homestead & Bunkie": { bg: "#E9EFE9", border: "#A4BCA4", text: "#3D583D" },
  "PinePoint":          { bg: "#E6EEF2", border: "#9DB9C9", text: "#2B4C5E" },
  "Cedar Grove":        { bg: "#F1E8DA", border: "#C9B48E", text: "#5E4523" },
  "Sugar Shack":        { bg: "#F5E4E0", border: "#D9A99E", text: "#7A3F32" },
};

const FAMILY_PALETTE = [
  { bg: "#FDE6D8", border: "#F3B58F", text: "#7A3520", dot: "#C26D5C" },
  { bg: "#E1ECF4", border: "#9DB9C9", text: "#2B4C5E", dot: "#5A8CA8" },
  { bg: "#E9EFE9", border: "#A4BCA4", text: "#3D583D", dot: "#6B8E6B" },
  { bg: "#F5E6D8", border: "#D9B98F", text: "#6B4423", dot: "#A67843" },
  { bg: "#F0E1EE", border: "#C9A4C5", text: "#5E2B58", dot: "#9D6A99" },
  { bg: "#E8E4D6", border: "#B8AE8E", text: "#4A4423", dot: "#8A7E52" },
  { bg: "#FBE5E5", border: "#E4A4A4", text: "#6B2929", dot: "#B86060" },
  { bg: "#E0EBE3", border: "#9DBFA3", text: "#28492E", dot: "#5C8762" },
];

export function familyColor(guestName) {
  if (!guestName) return FAMILY_PALETTE[0];
  const key = guestName.trim().split(/\s+/).slice(-1)[0].toLowerCase();
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) & 0xffffffff;
  return FAMILY_PALETTE[Math.abs(h) % FAMILY_PALETTE.length];
}

export function cabinStyle(cabin) {
  return (
    CABIN_STYLES[cabin] || { bg: "#EBE6DF", border: "#C9C2B6", text: "#4A4846" }
  );
}
