import axios, { AxiosError } from "axios";

const host = window.location.hostname;
const BASE = import.meta.env.VITE_API_URL || `http://${host}:8000/api`;

export const api = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
});

const ACCESS_KEY = "nrc_access";
const REFRESH_KEY = "nrc_refresh";

export const tokenStore = {
  get access() { return localStorage.getItem(ACCESS_KEY); },
  get refresh() { return localStorage.getItem(REFRESH_KEY); },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

api.interceptors.request.use((config) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original: any = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = tokenStore.refresh;
      if (!refresh) { tokenStore.clear(); return Promise.reject(error); }
      try {
        refreshing = refreshing || axios
          .post(`${BASE}/auth/token/refresh/`, { refresh })
          .then((res) => {
            tokenStore.set(res.data.access, refresh);
            refreshing = null;
            return res.data.access;
          });
        const newAccess = await refreshing;
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch {
        tokenStore.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export type LoginResponse = { access: string; refresh: string };
export const login = (username: string, password: string) =>
  axios.post<LoginResponse>(`${BASE}/auth/token/`, { username, password });

export type MemberProfile = {
  id: number;
  full_name: string;
  student_id: string;
  first_name: string;
  last_name: string;
  status: string;
  current_mphakati: { id: number; name: string } | null;
  current_semester: { id: number; label: string } | null;
};

export const getMyProfile = () => api.get<MemberProfile>("/members/me/profile/");
export const getMyParticipation = () => api.get("/members/me/participation/");
export const getMyContributions = () => api.get("/members/me/contributions/");
export const getMyRank = () => api.get("/members/me/rank/");
export const getOverview = () => api.get("/dashboard/overview/");
export const getChampion = () => api.get("/dashboard/current-champion/");

export type JwtPayload = { user_id: string; token_type: string; exp: number };

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch { return null; }
}

// ---- Me (identity + role) ----
export type Me = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  is_superuser: boolean;
  has_member_profile: boolean;
  member_id: number | null;
};

export const getMe = () => api.get<Me>("/auth/me/");

// ---- Dropdown data ----
export type Mphakati = { id: number; name: string };
export type Semester = { id: number; number: number; academic_year: { name: string } };

export const getMiphakati = () => api.get<{ results: Mphakati[] }>("/organizations/miphakati/");
export const getSemesters = () => api.get<{ results: Semester[] }>("/organizations/semesters/");

// ---- Activity Categories ----
export type ActivityCategory = { id: number; name: string };
export const getActivityCategories = () => api.get<{ results: ActivityCategory[] }>("/activities/activity-categories/");

// ---- Finance ----
export type FinanceCategory = { id: number; name: string; transaction_type: string; score_impact: string };
export const getFinanceCategories = () => api.get<{ results: FinanceCategory[] }>("/finance/finance-categories/");
export const getMembersList = () => api.get("/members/members/?page_size=200");

// ---- Scoring Config ----
export const getScoringConfigs = () => api.get("/activities/scoring-configurations/?page_size=50");
export const getScoringRules = (configId: number) => api.get(`/activities/scoring-rules/?configuration=${configId}`);
export const getCategories = () => api.get("/activities/activity-categories/?page_size=50");
export const updateScoringRule = (id: number, weight: number) => api.patch(`/activities/scoring-rules/${id}/`, { weight });
export const createScoringRule = (configId: number, categoryId: number, weight: number) => api.post("/activities/scoring-rules/", { configuration: configId, category: categoryId, weight });
export const finalizeScoringConfig = (id: number) => api.post(`/activities/scoring-configurations/${id}/finalize/`, { reason: "Finalized via UI" });

export const getLeaderboard = (configId: number) => api.get(`/activities/scoring-configurations/${configId}/leaderboard/`);

// ---- File Downloads ----
export const downloadFile = async (url: string, filename: string) => {
  try {
    const response = await api.get(url, { responseType: 'blob' });
    
    // Create a URL for the blob
    const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
    
    // Create a temporary anchor tag to trigger the download
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error: any) {
    console.error("Download failed", error);
    let msg = "Failed to download file.";
    // The backend sends JSON even when we request a blob, so we have to read it
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const json = JSON.parse(text);
        if (json.detail) msg = json.detail;
      } catch { /* ignore parse errors */ }
    }
    alert(msg);
  }
};

// ---- Notifications ----
export type Notification = {
  id: number;
  kind: string;
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  created_at: string;
};

export const getNotifications = () => api.get<{ results: Notification[] }>("/engagement/notifications/?page_size=20");
export const markNotificationRead = (id: number) => api.post(`/engagement/notifications/${id}/mark_read/`);
export const markAllNotificationsRead = () => api.post("/engagement/notifications/mark_all_read/");

export const updateMyProfile = (data: { phone?: string; email?: string }) => api.patch("/members/me/profile/", data);

// ---- Member Transfer ----
export const transferMember = (memberId: number, data: { mphakati_id: number, semester_id: number }) => api.post(`/members/members/${memberId}/transfer/`, data);

export const activateSemester = (id: number) => api.post(`/organizations/semesters/${id}/activate/`);

export const activateAcademicYear = (id: number) => api.post(`/organizations/academic-years/${id}/activate/`);

// ---- QR Attendance ----
export const getActivityQR = (id: number) => api.get(`/activities/activities/${id}/qr_code/`);
export const checkInWithToken = (token: string) => api.post("/activities/activities/checkin/", { token });

// ---- Registration & Auth ----
export const registerUser = (data: any) => api.post("/auth/register/", data);
export const forgotPassword = (email: string) => api.post("/auth/forgot-password/", { email });

// ---- Registration & Auth ----

export const resetPasswordConfirm = (data: { uid: string; token: string; new_password: string }) => 
  api.post("/auth/reset-password/", data);

// ---- Profile Picture Upload ----
export const uploadProfilePicture = (file: File) => {
  const formData = new FormData();
  formData.append("profile_picture", file);
  return api.patch("/members/me/profile/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// Helper to get the full URL for an image
export const getMediaUrl = (path: string | null | undefined) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const host = window.location.hostname;
  return `http://${host}:8000${path}`;
};

// ---- Admin Member Detail View ----
export const getMemberProfileData = (memberId: number) => api.get(`/members/members/${memberId}/profile_data/`);

// ---- Elections ----
export type Election = {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  results_published: boolean;
  positions: any[];
  total_votes: number;
};

export const getElections = () => api.get<{ results: Election[] }>("/elections/?page_size=50");
export const getElection = (id: number) => api.get<Election>(`/elections/${id}/`);
export const getMyBallot = (id: number) => api.get(`/elections/${id}/my_ballot/`);
export const getResults = (id: number) => api.get(`/elections/${id}/results/`);
export const castVote = (electionId: number, positionId: number, candidateId: number) =>
  api.post(`/elections/${electionId}/cast_vote/`, { position_id: positionId, candidate_id: candidateId });
export const createElection = (data: any) => api.post("/elections/", data);
export const updateElection = (id: number, data: any) => api.patch(`/elections/${id}/`, data);
export const createPosition = (data: any) => api.post("/positions/", data);
export const createCandidate = (data: any) => api.post("/candidates/", data);
export const deletePosition = (id: number) => api.delete(`/positions/${id}/`);
export const deleteCandidate = (id: number) => api.delete(`/candidates/${id}/`);

export const updateCandidate = (id: number, data: any) => api.patch(`/candidates/${id}/`, data);

export const getUsers = () => api.get("/users/?page_size=200");
export const updateUser = (id: number, data: any) => api.patch(`/users/${id}/`, data);

// ---- Finalists ----
export const getFinalistWindow = () => api.get("/finalists/window/");
export const getFinalists = () => api.get("/finalists/?page_size=200");
export const registerFinalist = (data: any) => api.post("/finalists/", data);
export const approveFinalist = (id: number) => api.post(`/finalists/${id}/approve/`);
export const rejectFinalist = (id: number) => api.post(`/finalists/${id}/reject/`);

export const updateAnnouncement = (id: number, data: any) => api.patch(`/engagement/announcements/${id}/`, data);
export const deleteAnnouncement = (id: number) => api.delete(`/engagement/announcements/${id}/`);
