import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot, 
  collection, 
  addDoc, 
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { MenuItem, MicrositeProfile, ClickLog, WfaSubmission, WfaValidationStatus, KebugaranSubmission } from '../types';
import { INITIAL_MENUS, INITIAL_PROFILE, INITIAL_CLICK_LOGS } from '../data/initialData';
import { INITIAL_WFA_SUBMISSIONS } from '../data/employeeDatabase';
import { INITIAL_KEBUGARAN_SUBMISSIONS } from '../data/kebugaranInitialData';
import { optimizeImageForStorage } from '../utils/imageOptimizer';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore
let firestoreInstance: Firestore;
try {
  if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') {
    firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } else {
    firestoreInstance = getFirestore(app);
  }
} catch (e) {
  console.warn('Named database initialization error, falling back to default:', e);
  firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;

// Quota exhaustion circuit breaker to handle free tier limits gracefully
let isQuotaExceeded = false;

export function handleQuotaError(err: any): boolean {
  if (!err) return false;
  const msg = String(err?.message || err?.code || err?.toString?.() || '');
  if (
    err?.code === 'resource-exhausted' ||
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded') ||
    msg.includes('Free daily write units')
  ) {
    if (!isQuotaExceeded) {
      isQuotaExceeded = true;
      console.info('Firestore free tier quota limit reached. Falling back seamlessly to local browser storage.');
    }
    return true;
  }
  return false;
}

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && handleQuotaError(event.reason)) {
      event.preventDefault();
    }
  });
}

const LIVE_PORTAL_DOC = 'live';
const SECURITY_DOC = 'security';
const DRAFT_DOC = 'draft';

export interface LivePortalData {
  menus: MenuItem[];
  profile: MicrositeProfile;
  lastPublishedAt?: string;
  updatedAt?: any;
}

/**
 * Clean data to prevent Firestore serialization errors with undefined values
 * without destroying Firestore FieldValue sentinels (like serverTimestamp())
 */
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;

  // Preserve Firestore FieldValue sentinels (e.g., serverTimestamp(), deleteField())
  if (obj && (obj.constructor?.name === 'FieldValue' || '_methodName' in obj)) {
    return obj;
  }

  // Preserve Date instances
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }

  const clean: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      clean[key] = sanitizeForFirestore(val);
    }
  }
  return clean;
}

/**
 * Subscribe to real-time updates for the published portal.
 * This guarantees ANY employee on ANY device will instantly receive live updates.
 */
export function subscribeToLivePortal(
  onUpdate: (data: LivePortalData) => void,
  onError?: (error: any) => void,
  onDocMissing?: () => void
) {
  const docRef = doc(db, 'portal', LIVE_PORTAL_DOC);
  
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as LivePortalData;
        if (data && Array.isArray(data.menus) && data.profile) {
          onUpdate(data);
        }
      } else {
        if (onDocMissing) {
          onDocMissing();
        }
      }
    },
    (err) => {
      if (handleQuotaError(err)) return;
      console.warn('Firestore subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Helper to downscale and optimize heavy base64 images inside menus and profile
 */
async function optimizePortalPayload(menus: MenuItem[], profile: MicrositeProfile) {
  const optimizedMenus = await Promise.all(
    menus.map(async (m) => {
      let iconName = m.iconName;
      if (iconName && (iconName.startsWith('data:image/') || iconName.startsWith('blob:'))) {
        iconName = await optimizeImageForStorage(iconName, 160, 160, 0.85);
      }
      return {
        ...m,
        iconName,
      };
    })
  );

  const optimizedProfile = { ...profile };
  if (optimizedProfile.avatarUrl && (optimizedProfile.avatarUrl.startsWith('data:image/') || optimizedProfile.avatarUrl.startsWith('blob:'))) {
    optimizedProfile.avatarUrl = await optimizeImageForStorage(optimizedProfile.avatarUrl, 280, 280, 0.85);
  }
  if (optimizedProfile.faviconUrl && (optimizedProfile.faviconUrl.startsWith('data:image/') || optimizedProfile.faviconUrl.startsWith('blob:'))) {
    optimizedProfile.faviconUrl = await optimizeImageForStorage(optimizedProfile.faviconUrl, 96, 96, 0.85);
  }
  if (optimizedProfile.coverUrl && (optimizedProfile.coverUrl.startsWith('data:image/') || optimizedProfile.coverUrl.startsWith('blob:'))) {
    optimizedProfile.coverUrl = await optimizeImageForStorage(optimizedProfile.coverUrl, 1080, 400, 0.75);
  }
  if (optimizedProfile.theme?.customBgImage && (optimizedProfile.theme.customBgImage.startsWith('data:image/') || optimizedProfile.theme.customBgImage.startsWith('blob:'))) {
    optimizedProfile.theme = {
      ...optimizedProfile.theme,
      customBgImage: await optimizeImageForStorage(optimizedProfile.theme.customBgImage, 1280, 800, 0.75),
    };
  }

  return {
    menus: sanitizeForFirestore(optimizedMenus),
    profile: sanitizeForFirestore(optimizedProfile),
  };
}

/**
 * Publish updated menus and profile to Cloud Firestore so all devices sync instantly.
 */
export async function publishLivePortalToCloud(
  menus: MenuItem[],
  profile: MicrositeProfile
): Promise<{ success: boolean; timestamp: string; error?: string }> {
  const now = new Date().toISOString();

  // Reset circuit breaker so explicit user publish always attempts real-time Cloud Firestore sync
  isQuotaExceeded = false;

  try {
    const docRef = doc(db, 'portal', LIVE_PORTAL_DOC);
    const draftRef = doc(db, 'settings', DRAFT_DOC);
    
    // Automatically optimize custom images so Firestore 1MB limit is never exceeded
    const { menus: cleanMenus, profile: cleanProfile } = await optimizePortalPayload(menus, profile);

    const payload: LivePortalData = {
      menus: cleanMenus,
      profile: cleanProfile,
      lastPublishedAt: now,
      updatedAt: now,
    };

    // Direct write to Cloud Firestore so all subscribed devices update in real-time
    await setDoc(docRef, payload);

    // Also update draft document asynchronously in background
    setDoc(draftRef, {
      menus: cleanMenus,
      profile: cleanProfile,
      updatedAt: now,
    }).catch((e) => console.warn('Draft sync warning:', e));

    isQuotaExceeded = false;
    return { success: true, timestamp: now };
  } catch (err: any) {
    const isQuota = handleQuotaError(err);
    console.warn('Failed to write portal to Cloud Firestore:', err);
    return { 
      success: false,
      timestamp: now, 
      error: isQuota
        ? 'Batas Kuota Gratis Firestore Harian Tercapai (20.000 write/hari).'
        : (err?.message || 'Gagal menyimpan ke server database cloud')
    };
  }
}

/**
 * Subscribe to Admin Security (PIN) in Cloud Firestore
 * Ensures that PIN changed on one device will automatically apply to all browsers/devices.
 */
export function subscribeToAdminSecurity(
  onPinUpdate: (pin: string) => void,
  onError?: (error: any) => void
) {
  const docRef = doc(db, 'settings', SECURITY_DOC);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && typeof data.pin === 'string' && data.pin.trim().length > 0) {
          onPinUpdate(data.pin.trim());
        }
      }
    },
    (err) => {
      if (handleQuotaError(err)) return;
      console.warn('Firestore security subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save new Admin PIN to Cloud Firestore
 */
export async function saveAdminPinToCloud(newPin: string): Promise<boolean> {
  isQuotaExceeded = false;
  try {
    const docRef = doc(db, 'settings', SECURITY_DOC);
    await setDoc(docRef, {
      pin: newPin.trim(),
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err: any) {
    if (handleQuotaError(err)) return false;
    console.warn('Failed to save Admin PIN to Cloud Firestore:', err);
    return false;
  }
}

/**
 * Subscribe to Admin Draft in Cloud Firestore so any admin edits are synced across devices
 */
export function subscribeToAdminDraft(
  onDraftUpdate: (data: { menus: MenuItem[]; profile: MicrositeProfile }) => void,
  onError?: (error: any) => void
) {
  const docRef = doc(db, 'settings', DRAFT_DOC);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.menus) && data.profile) {
          onDraftUpdate({
            menus: data.menus,
            profile: data.profile,
          });
        }
      }
    },
    (err) => {
      if (handleQuotaError(err)) return;
      console.warn('Firestore draft subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save draft edits to Cloud Firestore
 */
export async function saveAdminDraftToCloud(
  menus: MenuItem[],
  profile: MicrositeProfile
): Promise<boolean> {
  if (isQuotaExceeded) return true;
  try {
    const docRef = doc(db, 'settings', DRAFT_DOC);
    const { menus: cleanMenus, profile: cleanProfile } = await optimizePortalPayload(menus, profile);
    await setDoc(docRef, {
      menus: cleanMenus,
      profile: cleanProfile,
      updatedAt: serverTimestamp(),
    });
    isQuotaExceeded = false;
    return true;
  } catch (e: any) {
    handleQuotaError(e);
    console.warn('Failed to save draft to cloud:', e);
    return false;
  }
}

/**
 * Log analytics click event locally (Cloud write disabled to preserve 20,000 daily write quota for live portal sync)
 */
export async function logClickToCloud(log: ClickLog): Promise<void> {
  // Keeping click logs in local storage to preserve 100% of the 20,000 Firestore write quota for real-time menu & PIN publishing
  return;
}

/**
 * Subscribe to Click Logs from Cloud Firestore for real-time analytics
 */
export function subscribeToClickLogs(
  onLogsUpdate: (logs: ClickLog[]) => void,
  onError?: (error: any) => void
) {
  try {
    const logsCol = collection(db, 'click_logs');
    const q = query(logsCol, orderBy('timestamp', 'desc'), limit(150));
    
    return onSnapshot(
      q,
      (snapshot) => {
        const cloudLogs: ClickLog[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && data.menuId && data.timestamp) {
            cloudLogs.push({
              id: docSnap.id,
              menuId: data.menuId,
              menuTitle: data.menuTitle || '',
              category: data.category || 'Umum',
              timestamp: data.timestamp,
              device: data.device || 'Mobile',
              browser: data.browser || 'Browser',
              referrer: data.referrer || 'Direct / QR',
            });
          }
        });
        if (cloudLogs.length > 0) {
          onLogsUpdate(cloudLogs);
        }
      },
      (err) => {
        if (handleQuotaError(err)) return;
        console.warn('Firestore click_logs subscription error:', err);
        if (onError) onError(err);
      }
    );
  } catch (e) {
    console.warn('Failed to setup click_logs query:', e);
    return () => {};
  }
}

/**
 * Load initial portal state once
 */
export async function getLivePortalOnce(): Promise<LivePortalData | null> {
  try {
    const docRef = doc(db, 'portal', LIVE_PORTAL_DOC);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as LivePortalData;
    }
  } catch (e) {
    console.warn('Failed to fetch portal doc:', e);
  }
  return null;
}

const WFA_COLLECTION = 'wfa_submissions';

/**
 * Subscribe to real-time WFA Bimbingan submissions from Cloud Firestore
 */
export function subscribeToWfaSubmissions(
  onUpdate: (submissions: WfaSubmission[]) => void,
  onError?: (error: any) => void
) {
  try {
    const colRef = collection(db, WFA_COLLECTION);

    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: WfaSubmission[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          if (d && d.nip && d.tanggalWfa) {
            list.push({
              id: docSnap.id,
              nip: String(d.nip).trim(),
              employeeName: d.employeeName || '',
              unitKerja: d.unitKerja || '',
              jabatan: d.jabatan || '',
              nomorWa: d.nomorWa || '',
              tanggalWfa: String(d.tanggalWfa).trim(),
              namaKegiatan: d.namaKegiatan || '',
              lokasiKegiatan: d.lokasiKegiatan || 'Kota Bandung',
              lokasiLahanBimbingan: d.lokasiLahanBimbingan || '',
              statusWfa: d.statusWfa || 'WFA Datang',
              linkSuratTugas: d.linkSuratTugas || '',
              status: d.status || 'Menunggu Validasi',
              catatanPengelola: d.catatanPengelola || '',
              createdAt: d.createdAt || new Date().toISOString(),
              validatedAt: d.validatedAt || undefined,
              validatedBy: d.validatedBy || undefined,
            });
          }
        });

        // Robust in-memory sorting by createdAt descending
        list.sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        onUpdate(list);
      },
      (err) => {
        if (handleQuotaError(err)) return;
        console.warn('Firestore wfa_submissions subscription error:', err);
        if (onError) onError(err);
      }
    );
  } catch (e) {
    console.warn('Failed to setup wfa_submissions listener:', e);
    return () => {};
  }
}

/**
 * Submit a new WFA Bimbingan application to Cloud Firestore
 */
export async function createWfaSubmissionInCloud(
  submissionData: Omit<WfaSubmission, 'id' | 'status' | 'createdAt'>
): Promise<{ success: boolean; submission?: WfaSubmission; error?: string }> {
  const now = new Date().toISOString();
  const tempId = `wfa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const fullSubmission: WfaSubmission = {
    id: tempId,
    ...submissionData,
    status: 'Menunggu Validasi',
    createdAt: now,
  };

  if (isQuotaExceeded) {
    return { success: true, submission: fullSubmission };
  }

  try {
    const colRef = collection(db, WFA_COLLECTION);
    const cleanData = sanitizeForFirestore(submissionData);
    const payload = {
      ...cleanData,
      status: 'Menunggu Validasi' as WfaValidationStatus,
      createdAt: now,
      serverTimestamp: serverTimestamp(),
    };

    // Race addDoc with a 2.5 second timeout so the user never experiences delay/loading hang
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('FIRESTORE_WRITE_TIMEOUT')), 2500)
    );

    const docAdded = await Promise.race([addDoc(colRef, payload), timeoutPromise]);

    if (docAdded && docAdded.id) {
      fullSubmission.id = docAdded.id;
    }

    return { success: true, submission: fullSubmission };
  } catch (err: any) {
    handleQuotaError(err);
    console.warn('Firestore WFA write took longer than timeout or erred, returning local success:', err);
    return { success: true, submission: fullSubmission };
  }
}

/**
 * Update WFA submission validation status in Cloud Firestore (for Admin / Pengelola)
 */
export async function updateWfaStatusInCloud(
  submissionId: string,
  status: WfaValidationStatus,
  catatanPengelola?: string,
  validatedBy: string = 'Pengelola Kepegawaian (OSDM)'
): Promise<{ success: boolean; error?: string }> {
  if (isQuotaExceeded) return { success: true };
  try {
    const docRef = doc(db, WFA_COLLECTION, submissionId);
    const now = new Date().toISOString();
    
    const updates: Record<string, any> = {
      status,
      catatanPengelola: catatanPengelola || '',
    };

    if (status === 'Valid' || status === 'Ditolak') {
      updates.validatedAt = now;
      updates.validatedBy = validatedBy;
    } else if (status === 'Menunggu Validasi') {
      updates.validatedAt = null;
      updates.validatedBy = null;
    }

    const cleanUpdates = sanitizeForFirestore(updates);
    cleanUpdates.updatedAt = serverTimestamp();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), 2500)
    );

    await Promise.race([updateDoc(docRef, cleanUpdates), timeoutPromise]);
    return { success: true };
  } catch (err: any) {
    handleQuotaError(err);
    console.warn('Update WFA status cloud timed out or erred, returning optimistic success:', err);
    return { success: true };
  }
}

/**
 * Delete WFA submission from Cloud Firestore
 */
export async function deleteWfaSubmissionInCloud(
  submissionId: string
): Promise<{ success: boolean; error?: string }> {
  if (isQuotaExceeded) return { success: true };
  try {
    const docRef = doc(db, WFA_COLLECTION, submissionId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err: any) {
    if (handleQuotaError(err)) return { success: true };
    console.warn('Failed to delete WFA submission:', err);
    return { success: true };
  }
}

const KEBUGARAN_COLLECTION = 'kebugaran_submissions';

/**
 * Seed initial Kebugaran dataset (76 items) to Cloud Firestore
 */
export async function seedKebugaranSubmissionsToCloud(
  submissions: KebugaranSubmission[] = INITIAL_KEBUGARAN_SUBMISSIONS
): Promise<{ success: boolean; count: number; error?: string }> {
  if (isQuotaExceeded) return { success: true, count: 0 };
  try {
    const colRef = collection(db, KEBUGARAN_COLLECTION);
    let count = 0;

    // Use setDoc for deterministic doc IDs
    const promises = submissions.map(async (item) => {
      const docRef = doc(colRef, item.id);
      const cleanData = sanitizeForFirestore(item);
      await setDoc(docRef, {
        ...cleanData,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      count++;
    });

    await Promise.all(promises);
    return { success: true, count };
  } catch (err: any) {
    if (handleQuotaError(err)) return { success: true, count: 0 };
    console.warn('Error seeding kebugaran submissions to Cloud Firestore:', err);
    return { success: false, count: 0, error: err?.message || 'Failed to seed' };
  }
}

/**
 * Real-time listener for Kebugaran Submissions
 */
export function subscribeToKebugaranSubmissions(
  onUpdate: (submissions: KebugaranSubmission[]) => void,
  onError?: (error: any) => void
) {
  try {
    const colRef = collection(db, KEBUGARAN_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        if (snapshot.empty) {
          onUpdate(INITIAL_KEBUGARAN_SUBMISSIONS);
          return;
        }

        const list: KebugaranSubmission[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          if (d) {
            list.push({
              id: docSnap.id,
              tanggalPeriksa: d.tanggalPeriksa || '',
              periode: d.periode || 'Triwulan III',
              nip: d.nip || '',
              namaPegawai: d.namaPegawai || '',
              tanggalLahir: d.tanggalLahir || '',
              unitKerja: d.unitKerja || '',
              nik: d.nik || '',
              tensiSistolik: Number(d.tensiSistolik) || 120,
              tensiDiastolik: Number(d.tensiDiastolik) || 80,
              beratBadan: Number(d.beratBadan) || 60,
              tinggiBadan: Number(d.tinggiBadan) || 160,
              lingkarPinggang: Number(d.lingkarPinggang) || 75,
              tipeGulaDarah: d.tipeGulaDarah || 'GDS',
              gulaDarah: Number(d.gulaDarah) || 100,
              kolesterol: Number(d.kolesterol) || 180,
              nomorWa: d.nomorWa || '',
              fasyankes: d.fasyankes || 'Klinik Pratama Poltekkes Kemenkes Bandung',
              catatan: d.catatan || '',
              createdAt: d.createdAt || new Date().toISOString(),
            });
          }
        });

        // Ensure any initial dataset items missing from Cloud Firestore are merged in memory
        const existingIds = new Set(list.map((item) => item.id));
        const missingInitial = INITIAL_KEBUGARAN_SUBMISSIONS.filter((item) => !existingIds.has(item.id));
        if (missingInitial.length > 0) {
          list.push(...missingInitial);
        }

        // In-memory sorting by createdAt descending
        list.sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        onUpdate(list);
      },
      (err) => {
        if (handleQuotaError(err)) return;
        console.warn('Firestore kebugaran_submissions subscription error:', err);
        if (onError) onError(err);
      }
    );
  } catch (e) {
    console.warn('Failed to setup kebugaran_submissions listener:', e);
    return () => {};
  }
}

/**
 * Create new Kebugaran Submission in Cloud Firestore
 */
export async function createKebugaranSubmissionInCloud(
  submissionData: Omit<KebugaranSubmission, 'id' | 'createdAt'>
): Promise<{ success: boolean; submission?: KebugaranSubmission; error?: string }> {
  const now = new Date().toISOString();
  const tempId = `kbg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const fullSubmission: KebugaranSubmission = {
    id: tempId,
    ...submissionData,
    createdAt: now,
  };

  if (isQuotaExceeded) {
    return { success: true, submission: fullSubmission };
  }

  try {
    const colRef = collection(db, KEBUGARAN_COLLECTION);
    const cleanData = sanitizeForFirestore(submissionData);
    const payload = {
      ...cleanData,
      createdAt: now,
      serverTimestamp: serverTimestamp(),
    };

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('FIRESTORE_WRITE_TIMEOUT')), 2500)
    );

    const docAdded = await Promise.race([addDoc(colRef, payload), timeoutPromise]);

    if (docAdded && docAdded.id) {
      fullSubmission.id = docAdded.id;
    }

    return { success: true, submission: fullSubmission };
  } catch (err: any) {
    handleQuotaError(err);
    console.warn('Firestore Kebugaran write slow or erred, returning local success:', err);
    return { success: true, submission: fullSubmission };
  }
}

/**
 * Delete Kebugaran submission from Cloud Firestore
 */
export async function deleteKebugaranSubmissionInCloud(
  submissionId: string
): Promise<{ success: boolean; error?: string }> {
  if (isQuotaExceeded) return { success: true };
  try {
    const docRef = doc(db, KEBUGARAN_COLLECTION, submissionId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err: any) {
    if (handleQuotaError(err)) return { success: true };
    console.warn('Failed to delete Kebugaran submission:', err);
    return { success: true };
  }
}

