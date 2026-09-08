import { MenuItem, MicrositeProfile, ClickLog, ThemeConfig } from '../types';

export const THEME_PRESETS: ThemeConfig[] = [
  {
    id: 'poltekkes-emerald',
    name: 'Poltekkes Kemenkes Emerald (Resmi)',
    bgType: 'mesh',
    primaryBg: '#042f2e',
    secondaryBg: '#0f766e',
    accentColor: '#10b981',
    textColor: '#ffffff',
    subtextColor: '#ccfbf1',
    cardRadius: 'rounded-xl',
    cardGlassEffect: true,
    fontFamily: 'sans',
    layoutStyle: 'stacked',
  },
  {
    id: 'corporate-navy',
    name: 'Corporate Navy & Blue',
    bgType: 'gradient',
    primaryBg: '#0f172a',
    secondaryBg: '#1e3a8a',
    accentColor: '#38bdf8',
    textColor: '#ffffff',
    subtextColor: '#cbd5e1',
    cardRadius: 'rounded-xl',
    cardGlassEffect: true,
    fontFamily: 'sans',
    layoutStyle: 'stacked',
  },
  {
    id: 'midnight-emerald',
    name: 'Midnight Teal & Emerald',
    bgType: 'mesh',
    primaryBg: '#090d16',
    secondaryBg: '#064e3b',
    accentColor: '#10b981',
    textColor: '#ffffff',
    subtextColor: '#94a3b8',
    cardRadius: 'rounded-2xl',
    cardGlassEffect: true,
    fontFamily: 'outfit',
    layoutStyle: 'stacked',
  },
  {
    id: 'cyber-indigo',
    name: 'Executive Indigo & Slate',
    bgType: 'gradient',
    primaryBg: '#0f172a',
    secondaryBg: '#4f46e5',
    accentColor: '#818cf8',
    textColor: '#ffffff',
    subtextColor: '#cbd5e1',
    cardRadius: 'rounded-xl',
    cardGlassEffect: true,
    fontFamily: 'sans',
    layoutStyle: 'stacked',
  },
  {
    id: 'luxe-clean',
    name: 'Minimal Modern Charcoal',
    bgType: 'dark-neon',
    primaryBg: '#0a0a0a',
    secondaryBg: '#171717',
    accentColor: '#38bdf8',
    textColor: '#f8fafc',
    subtextColor: '#94a3b8',
    cardRadius: 'rounded-2xl',
    cardGlassEffect: true,
    fontFamily: 'sans',
    layoutStyle: 'stacked',
  },
  {
    id: 'clean-bento',
    name: 'Enterprise Bento Layout',
    bgType: 'mesh',
    primaryBg: '#0f172a',
    secondaryBg: '#334155',
    accentColor: '#60a5fa',
    textColor: '#ffffff',
    subtextColor: '#94a3b8',
    cardRadius: 'rounded-xl',
    cardGlassEffect: true,
    fontFamily: 'sans',
    layoutStyle: 'bento',
  }
];

export const INITIAL_PROFILE: MicrositeProfile = {
  name: 'Portal Layanan Pegawai',
  tagline: 'PUSAT AKSES LAYANAN INTERNAL',
  bio: 'Portal satu pintu bagi seluruh pegawai Poltekkes Kemenkes Bandung',
  avatarUrl: 'https://poltekkesbandung.ac.id/wp-content/uploads/2026/05/cropped-logo-transparan-2.png',
  logoShape: 'landscape',
  logoHeight: 74,
  logoBackground: 'white',
  coverUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80',
  isVerified: true,
  location: 'Jl. Padjadjaran No. 56 Bandung',
  openingHours: 'Layanan : 08.00 - 16.00 WIB',
  socialLinks: [
    { id: '1', platform: 'whatsapp', url: 'https://wa.me/6281234567890?text=Halo%20Admin%20OSDM%20Poltekkes%20Bandung', label: 'Helpdesk WhatsApp OSDM', isActive: true },
    { id: '2', platform: 'email', url: 'mailto:kepegawaian@poltekkesbandung.ac.id', label: 'Email Kepegawaian', isActive: true },
    { id: '3', platform: 'phone', url: 'tel:+62224231627', label: 'Telepon Kantor (022-4231627)', isActive: true },
    { id: '4', platform: 'website', url: 'https://www.poltekkesbandung.ac.id', label: 'Portal Utama Poltekkes Bandung', isActive: true },
    { id: '5', platform: 'maps', url: 'https://maps.google.com/?q=Politeknik+Kesehatan+Kemenkes+Bandung+Jl+Pajajaran+No+56', label: 'Lokasi Kampus Direktorat', isActive: true }
  ],
  footerBadgeText: 'Portal Resmi OSDM • Poltekkes Kemenkes Bandung • Kemenkes RI',
  footerCopyright: '© 2026 OSDM Poltekkes Kemenkes Bandung. Hak Cipta Dilindungi.',
  tabTitle: 'OSDM Poltekkes Kemenkes Bandung - Portal Layanan Pegawai',
  faviconUrl: '',
  theme: THEME_PRESETS[0],
  osdmContactWa: '08119712525'
};

export const INITIAL_MENUS: MenuItem[] = [
  {
    id: 'menu-dashboard-pegawai',
    title: 'Dashboard Pegawai',
    subtitle: 'Realtime Seluruh Pegawai Poltekkes Kemenkes Bandung',
    url: '#dashboard-pegawai',
    type: 'custom',
    size: 'featured',
    bgColor: '#0284c7',
    textColor: '#ffffff',
    borderColor: '#38bdf8',
    isGradient: true,
    gradientTo: '#0369a1',
    gradientAngle: 135,
    iconName: 'LayoutDashboard',
    badgeText: '',
    isActive: true,
    order: 1,
    animation: 'pulse',
    clickCount: 850,
    category: 'Kepegawaian & HR',
    openInNewTab: false
  },
  {
    id: 'menu-database-pegawai',
    title: 'Database Pegawai',
    subtitle: 'Data Seluruh Pegawai Poltekkes Kemenkes Bandung',
    url: '#database-pegawai',
    type: 'custom',
    size: 'large',
    bgColor: '#0f766e',
    textColor: '#ffffff',
    borderColor: '#14b8a6',
    isGradient: true,
    gradientTo: '#042f2e',
    gradientAngle: 135,
    iconName: 'Database',
    isActive: true,
    order: 2,
    animation: 'none',
    clickCount: 710,
    category: 'Kepegawaian & HR',
    openInNewTab: false,
    isProtected: true,
    pinCode: '1234',
    pinHint: 'PIN Akses Database Pegawai'
  },
  {
    id: 'menu-cuti-pegawai',
    title: 'Cuti Pegawai',
    subtitle: 'Ajukan Cuti Melalui Portal e-Office',
    url: 'https://osdm.poltekkesbandung.ac.id/cuti',
    type: 'link',
    size: 'large',
    bgColor: '#0f766e',
    textColor: '#ffffff',
    borderColor: '#14b8a6',
    isGradient: true,
    gradientTo: '#042f2e',
    gradientAngle: 135,
    iconName: 'Palmtree',
    isActive: true,
    order: 3,
    animation: 'none',
    clickCount: 430,
    category: 'Kepegawaian & HR',
    openInNewTab: true
  },
  {
    id: 'menu-inventarisir-lahan',
    title: 'Inventarisir Lahan Bimbingan',
    subtitle: 'Input Daftar Nama Lahan Bimbingan se-Bandung Raya (Luar Kota Bandung)',
    url: '#inventarisir-lahan',
    type: 'custom',
    size: 'large',
    bgColor: '#0f766e',
    textColor: '#ffffff',
    borderColor: '#14b8a6',
    isGradient: true,
    gradientTo: '#042f2e',
    gradientAngle: 135,
    iconName: 'ClipboardList',
    isActive: true,
    order: 4,
    animation: 'none',
    clickCount: 380,
    category: 'Kepegawaian & HR',
    openInNewTab: false
  },
  {
    id: 'menu-wfa-bimbingan',
    title: 'Formulir Pengajuan WFA Bimbingan',
    subtitle: 'Pengajuan jadwal WFA bimbingan dosen di Kota/Kabupaten',
    url: '#wfa-bimbingan',
    type: 'custom',
    size: 'featured',
    bgColor: '#0f766e',
    textColor: '#ffffff',
    borderColor: '#14b8a6',
    isGradient: true,
    gradientTo: '#042f2e',
    gradientAngle: 135,
    iconName: 'FileText',
    badgeText: 'POPULER',
    badgeBgColor: '#8b5cf6',
    badgeTextColor: '#ffffff',
    isActive: true,
    order: 5,
    animation: 'pulse',
    clickCount: 620,
    category: 'Kepegawaian & HR',
    openInNewTab: false,
    isProtected: true,
    pinCode: '1234',
    pinHint: 'PIN Pengajuan WFA Bimbingan'
  },
  {
    id: 'menu-kebugaran-jasmani',
    title: 'Input Hasil Kebugaran Pegawai',
    subtitle: 'Lengkapi Data Kebugaran Terakhir Anda',
    url: '#input-kebugaran',
    type: 'custom',
    size: 'featured',
    bgColor: '#0f766e',
    textColor: '#ffffff',
    borderColor: '#14b8a6',
    isGradient: true,
    gradientTo: '#042f2e',
    gradientAngle: 135,
    iconName: 'Shield',
    badgeText: 'NEWS',
    badgeBgColor: '#ef4444',
    badgeTextColor: '#ffffff',
    isActive: true,
    order: 6,
    animation: 'pulse',
    clickCount: 450,
    category: 'Kepegawaian & HR',
    openInNewTab: false,
    isProtected: true,
    pinCode: '1234',
    pinHint: 'PIN Input Hasil Kebugaran'
  }
];

export const INITIAL_CLICK_LOGS: ClickLog[] = [
  {
    id: 'log-1',
    menuId: 'menu-1',
    menuTitle: '🕒 Presensi & Absensi Online Pegawai',
    category: 'Kepegawaian & Presensi',
    timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    device: 'Mobile',
    browser: 'Chrome Mobile',
    referrer: 'Akses Portal Pegawai'
  },
  {
    id: 'log-2',
    menuId: 'menu-2',
    menuTitle: '📊 e-Kinerja BKN & SKP Kemenkes',
    category: 'Kepegawaian & Presensi',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    device: 'Desktop',
    browser: 'Chrome 122',
    referrer: 'Portal OSDM'
  },
  {
    id: 'log-3',
    menuId: 'menu-3',
    menuTitle: '🌴 Pengajuan Cuti Pegawai Online (E-Cuti)',
    category: 'Layanan Administrasi SDM',
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    device: 'Mobile',
    browser: 'Safari iOS',
    referrer: 'WhatsApp Pegawai'
  }
];

export const CATEGORIES_PRESET = [
  'Semua',
  'Kepegawaian & Presensi',
  'Layanan Administrasi SDM',
  'Kesejahteraan & Remunerasi',
  'Pengembangan Karir & Diklat',
  'Persuratan & Dokumen',
  'Bantuan & Kontak OSDM'
];

export const DEFAULT_WFA_MENU: MenuItem = INITIAL_MENUS[0];
export const DEFAULT_KEBUGARAN_MENU: MenuItem = INITIAL_MENUS[1];

export const ensureHasWfaMenu = (menuList: MenuItem[]): MenuItem[] => {
  if (!Array.isArray(menuList) || menuList.length === 0) {
    return INITIAL_MENUS;
  }
  let result = [...menuList];

  const hasWfa = result.some(
    (m) =>
      m.id === 'menu-wfa-bimbingan' ||
      m.url === '#wfa-bimbingan' ||
      m.title?.toLowerCase().includes('wfa bimbingan') ||
      m.title?.toLowerCase().includes('formulir pengajuan wfa')
  );
  if (!hasWfa) {
    result.unshift(DEFAULT_WFA_MENU);
  }

  const hasKebugaran = result.some(
    (m) =>
      m.id === 'menu-kebugaran-jasmani' ||
      m.url === '#input-kebugaran' ||
      m.title?.toLowerCase().includes('kebugaran')
  );
  if (!hasKebugaran) {
    const wfaIdx = result.findIndex((m) => m.id === 'menu-wfa-bimbingan' || m.url === '#wfa-bimbingan');
    if (wfaIdx !== -1) {
      result.splice(wfaIdx + 1, 0, DEFAULT_KEBUGARAN_MENU);
    } else {
      result.unshift(DEFAULT_KEBUGARAN_MENU);
    }
  }

  return result;
};

