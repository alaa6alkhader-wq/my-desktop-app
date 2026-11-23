
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Smartphone, Wrench, ShoppingBag, CreditCard, Boxes, Wallet,
  LayoutDashboard, Search, Printer, PlusCircle, Plus, X,
  TrendingUp, AlertTriangle, Lock, Settings, Download, Upload,
  ShieldCheck, Database, Trash2, Edit3, Calendar, FileSpreadsheet,
  CheckCircle, Phone, Volume2, VolumeX, KeyRound, Ban, RotateCcw, EyeOff, ArrowRight
} from 'lucide-react';

// ============================================================================
// 1. الثوابت والتعريفات (TYPES & CONSTANTS)
// ============================================================================
const FIXED_SHOP_NAME = 'العلاش';
const DHIKR_TEXT = 'أستغفر الله عدد خلقه ورضا نفسه وزنة عرشه ومداد كلماته';
const DB_NAME = 'AlAllashOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';

type RepairType = 'PARTS_AND_REPAIR' | 'REPAIR_NO_PARTS' | 'PROGRAMMING';

interface Product {
  id: string;
  barcode: string;
  name: string;
  category: string;
  cost: number;
  price: number;
  qty: number;
  minQty: number;
}

interface CartItem {
  productId: string;
  name: string;
  cost: number;
  price: number;
  qty: number;
}

interface RepairPartDetail {
  productId: string;
  name: string;
  cost: number;
  price: number;
  qty: number;
}

interface RepairTicket {
  id: string;
  customerName: string;
  phone: string;
  model: string;
  imei?: string;
  fault: string;
  repairType: RepairType;
  repairFee: number;
  partsDetail: RepairPartDetail[];
  partsUsed: string[];
  cost: number;
  profit: number;
  paidStatus: 'PAID' | 'UNPAID';
  status: 'WAITING' | 'FIXING' | 'COMPLETED' | 'DELIVERED' | 'CANCELLED';
  date: string;
  businessDay: string;
}

interface Debt {
  id: string;
  refId?: string;
  customerName: string;
  phone: string;
  source: string;
  originalAmount: number;
  remainingAmount: number;
  date: string;
}

interface LedgerEntry {
  id: number;
  refId?: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  amount: number;
  date: string;
  businessDay: string;
  user: string;
}

interface ProfitEvent {
  id: string;
  refId?: string;
  businessDay: string;
  sourceType: 'SALE' | 'REPAIR' | 'PROGRAMMING' | 'EXPENSE';
  amount: number;
  description: string;
  timestamp: string;
}

interface DailyProfitRecord {
  id: string;
  date: string;
  dayName: string;
  periodLabel: string;
  salesProfit: number;
  repairProfit: number;
  expenses: number;
  netProfit: number;
}

interface AdminCreds {
  username: string;
  password: string;
  profitsPassword: string;
  rememberWord: string;
  shopPhone: string;
}

type PendingProtectedAction =
  | { kind: 'EDIT_PRODUCT'; product: Product }
  | { kind: 'DELETE_PRODUCT'; product: Product }
  | { kind: 'DELETE_REPAIR'; repair: RepairTicket }
  | { kind: 'CANCEL_REPAIR'; repair: RepairTicket }
  | { kind: 'DELETE_DEBT'; debt: Debt }
  | { kind: 'DELETE_LEDGER'; entry: LedgerEntry }
  | { kind: 'DELETE_PROFIT_ROW'; row: DailyProfitRecord }
  | { kind: 'CLEAR_ALL_PROFITS' };

const TAB_TITLES: Record<string, string> = {
  pos: 'سلة المبيعات',
  maintenance: 'ورشة الصيانة',
  inventory: 'إدارة المستودع',
  debts: 'الديون والأمانات',
  finance: 'الصندوق والحسابات',
  profits: 'الأرباح',
  settings: 'إعدادات النظام'
};

// ============================================================================
// 2. البيانات الافتراضية
// ============================================================================
const DEFAULT_PRODUCTS: Product[] = [
  { id: 'p1', barcode: '8901001', name: 'شاشة iPhone 13 Pro Max OLED', category: 'شاشات', cost: 75, price: 120, qty: 6, minQty: 3 },
  { id: 'p2', barcode: '8901002', name: 'بطارية سامسونج S22 Ultra 5000mAh', category: 'بطاريات', cost: 18, price: 35, qty: 12, minQty: 3 },
  { id: 'p3', barcode: '8901003', name: 'شاحن انكر Anker 20W Fast Charger', category: 'شواحن وكوابل', cost: 8, price: 18, qty: 2, minQty: 3 },
  { id: 'p4', barcode: '8901004', name: 'كابل آيفون أنكر الأصلي Type-C', category: 'شواحن وكوابل', cost: 4, price: 10, qty: 25, minQty: 5 },
  { id: 'p5', barcode: '8901005', name: 'لاصقة حماية نانو 9D لجميع الهواتف', category: 'كفرات ولاصقات', cost: 0.5, price: 3, qty: 50, minQty: 10 },
  { id: 'p6', barcode: '8901006', name: 'آيسي شحن Type-C بوردة ريدمي', category: 'قطع صيانة', cost: 3, price: 12, qty: 15, minQty: 4 }
];

const DEFAULT_REPAIRS: RepairTicket[] = [
  {
    id: 'REP-101',
    customerName: 'أحمد محمود',
    phone: '0599123456',
    model: 'iPhone 11',
    imei: '358291049281',
    fault: 'تبديل شاشة مكسورة',
    repairType: 'PARTS_AND_REPAIR',
    repairFee: 20,
    partsDetail: [],
    partsUsed: ['شاشة iPhone 11'],
    cost: 65,
    profit: 20,
    paidStatus: 'UNPAID',
    status: 'WAITING',
    date: '2026-11-07',
    businessDay: '2026-11-07'
  }
];

const DEFAULT_DEBTS: Debt[] = [
  { id: 'DB-1', customerName: 'محمد علي', phone: '0599334455', source: 'بيع قطعتين إكسسوار', originalAmount: 45, remainingAmount: 45, date: '2026-11-05' },
  { id: 'DB-2', refId: 'REP-101', customerName: 'أحمد محمود', phone: '0599123456', source: 'وصل صيانة #REP-101', originalAmount: 65, remainingAmount: 65, date: '2026-11-07' }
];

const DEFAULT_CREDS: AdminCreds = {
  username: 'admin',
  password: 'admin',
  profitsPassword: '1234',
  rememberWord: 'العلاش',
  shopPhone: '07700000000'
};

// ============================================================================
// 3. دوال مساعدة: التواريخ (6 صباحاً - 6 صباحاً)، الفواصل، الصوت، IndexedDB
// ============================================================================
function parseDecimal(val: string | number): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  const cleaned = String(val).replace(/[،,]/g, '.').trim();
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function formatMoney(n: number): string {
  return (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2);
}

function getBusinessDayKey(date: Date = new Date()): string {
  const d = new Date(date.getTime());
  if (d.getHours() < 6) {
    d.setDate(d.getDate() - 1);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDateDaysAgoKey(daysAgo: number, baseDateKey: string): string {
  const [y, m, d] = baseDateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - daysAgo);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function getArabicDayName(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('ar-EG', { weekday: 'long' });
}

let sharedAudioCtx: AudioContext | null = null;
function playPopSound(enabled: boolean) {
  if (!enabled) return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    if (!sharedAudioCtx) sharedAudioCtx = new AudioCtx();
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume();
    }
    const now = sharedAudioCtx.currentTime;
    const osc = sharedAudioCtx.createOscillator();
    const gain = sharedAudioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.065);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(sharedAudioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.095);
  } catch {
    // ignore
  }
}

function openAllashDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await openAllashDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openAllashDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // fallback
  }
}

function handleEnterKeyNavigation(e: React.KeyboardEvent<HTMLElement>) {
  if (e.key !== 'Enter') return;
  const target = e.target as HTMLElement;
  if (!target) return;
  const tag = target.tagName.toLowerCase();
  if (tag !== 'input' && tag !== 'select') return;
  if (target.dataset.enterAction === 'search-add') return;

  const container = target.closest('form') || target.closest('[data-enter-scope]') || document.body;
  const focusables = Array.from(
    container.querySelectorAll<HTMLElement>(
      'input:not([type="hidden"]):not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]), button[type="submit"]:not([disabled])'
    )
  ).filter(el => el.offsetParent !== null);

  const idx = focusables.indexOf(target);
  if (idx >= 0 && idx < focusables.length - 1) {
    e.preventDefault();
    const next = focusables[idx + 1];
    next.focus();
    if (next instanceof HTMLInputElement && next.type !== 'radio' && next.type !== 'checkbox') {
      next.select?.();
    }
  }
}

// ============================================================================
// 4. التطبيق الرئيسي (App)
// ============================================================================
export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [currentBusinessDay, setCurrentBusinessDay] = useState<string>(() => getBusinessDayKey());

  // قفل أيقونة الأرباح بكلمة مرور خاصة
  const [isProfitsUnlocked, setIsProfitsUnlocked] = useState<boolean>(false);
  const [showProfitsLockModal, setShowProfitsLockModal] = useState<boolean>(false);
  const [profitsUnlockInput, setProfitsUnlockInput] = useState<string>('');

  // بيانات النظام
  const [adminCreds, setAdminCreds] = useState<AdminCreds>(DEFAULT_CREDS);
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [repairs, setRepairs] = useState<RepairTicket[]>(DEFAULT_REPAIRS);
  const [debts, setDebts] = useState<Debt[]>(DEFAULT_DEBTS);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [profitEvents, setProfitEvents] = useState<ProfitEvent[]>([]);
  const [profitHistory, setProfitHistory] = useState<DailyProfitRecord[]>([]);
  const [activeBusinessDay, setActiveBusinessDay] = useState<string>(() => getBusinessDayKey());

  // تسجيل الدخول واستعادة كلمة المرور
  const [usernameInput, setUsernameInput] = useState('admin');
  const [passwordInput, setPasswordInput] = useState('admin');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [rememberInput, setRememberInput] = useState('');
  const [newUsernameInput, setNewUsernameInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // نافذة كلمة السر الموحدة لكل عمليات الحذف وتعديل المستودع وتفريغ الأرباح
  const [pendingAction, setPendingAction] = useState<PendingProtectedAction | null>(null);
  const [securityPassInput, setSecurityPassInput] = useState('');
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  // سلة المبيعات (POS)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [posSearch, setPosSearch] = useState('');
  const [cartSearchQuery, setCartSearchQuery] = useState('');
  const [cartSearchError, setCartSearchError] = useState('');
  const [posCategory, setPosCategory] = useState('ALL');
  const [posDiscountStr, setPosDiscountStr] = useState('0');
  const [posPayType, setPosPayType] = useState<'CASH' | 'DEBT'>('CASH');
  const [posCustName, setPosCustName] = useState('');
  const [posCustPhone, setPosCustPhone] = useState('');

  // ورشة الصيانة (Maintenance)
  const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);
  const [editingRepair, setEditingRepair] = useState<RepairTicket | null>(null);
  const [repCustName, setRepCustName] = useState('');
  const [repCustPhone, setRepCustPhone] = useState('');
  const [repModel, setRepModel] = useState('');
  const [repImei, setRepImei] = useState('');
  const [repFault, setRepFault] = useState('');
  const [repType, setRepType] = useState<RepairType>('PARTS_AND_REPAIR');
  const [repFeeStr, setRepFeeStr] = useState('0');
  const [repPayStatus, setRepPayStatus] = useState<'PAID' | 'UNPAID'>('UNPAID');
  const [repStatus, setRepStatus] = useState<RepairTicket['status']>('WAITING');
  const [repParts, setRepParts] = useState<RepairPartDetail[]>([]);
  const [selectedPartId, setSelectedPartId] = useState('');

  // المستودع (Inventory)
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCatFilter, setInventoryCatFilter] = useState('ALL');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodCat, setProdCat] = useState('شاشات');
  const [prodCostStr, setProdCostStr] = useState('0');
  const [prodPriceStr, setProdPriceStr] = useState('0');
  const [prodQtyStr, setProdQtyStr] = useState('1');
  const [prodMinQtyStr, setProdMinQtyStr] = useState('3');
  const [bulkMinQtyStr, setBulkMinQtyStr] = useState('3');

  // الديون (Debts)
  const [debtSearch, setDebtSearch] = useState('');
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [activeDebtToSettle, setActiveDebtToSettle] = useState<Debt | null>(null);
  const [settleAmountStr, setSettleAmountStr] = useState('0');
  const [settleError, setSettleError] = useState('');

  // الصندوق والمصروفات (Finance)
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmountStr, setExpenseAmountStr] = useState('');

  // تبويب الأرباح (Profits Tab)
  const [profitSearch, setProfitSearch] = useState('');
  const [profitPeriodFilter, setProfitPeriodFilter] = useState<'ALL' | 'WEEK' | 'CUSTOM'>('ALL');
  const [profitDateFrom, setProfitDateFrom] = useState('');
  const [profitDateTo, setProfitDateTo] = useState('');

  // الإعدادات (Settings)
  const [settingsUser, setSettingsUser] = useState(DEFAULT_CREDS.username);
  const [settingsPass, setSettingsPass] = useState(DEFAULT_CREDS.password);
  const [settingsProfitsPass, setSettingsProfitsPass] = useState(DEFAULT_CREDS.profitsPassword);
  const [settingsRemember, setSettingsRemember] = useState(DEFAULT_CREDS.rememberWord);
  const [settingsPhone, setSettingsPhone] = useState(DEFAULT_CREDS.shopPhone);

  const rolloverLockRef = useRef(false);

  // ============================================================================
  // 5. تحميل البيانات من IndexedDB + ترحيل localStorage القديم
  // ============================================================================
  useEffect(() => {
    let mounted = true;
    (async () => {
      const savedProducts = await idbGet<Product[]>('products');
      const savedRepairs = await idbGet<RepairTicket[]>('repairs');
      const savedDebts = await idbGet<Debt[]>('debts');
      const savedLedger = await idbGet<LedgerEntry[]>('ledger');
      const savedProfitEvents = await idbGet<ProfitEvent[]>('profitEvents');
      const savedProfitHistory = await idbGet<DailyProfitRecord[]>('profitHistory');
      const savedCreds = await idbGet<AdminCreds>('adminCreds');
      const savedBizDay = await idbGet<string>('activeBusinessDay');
      const savedSound = await idbGet<boolean>('soundEnabled');

      if (!mounted) return;

      if (!savedProducts) {
        const lsProd = localStorage.getItem('tp_products');
        const lsRep = localStorage.getItem('tp_repairs');
        const lsDebt = localStorage.getItem('tp_debts');
        const lsLedg = localStorage.getItem('tp_ledger');
        const lsCreds = localStorage.getItem('tp_admin_creds');

        const initProds = lsProd ? JSON.parse(lsProd) : DEFAULT_PRODUCTS;
        const initReps: RepairTicket[] = lsRep
          ? JSON.parse(lsRep).map((r: RepairTicket) => ({
              ...r,
              repairType: r.repairType || 'PARTS_AND_REPAIR',
              repairFee: r.repairFee ?? r.cost ?? 0,
              partsDetail: r.partsDetail || [],
              profit: r.profit ?? r.cost ?? 0,
              businessDay: r.businessDay || r.date || getBusinessDayKey()
            }))
          : DEFAULT_REPAIRS;
        const initDebts = lsDebt ? JSON.parse(lsDebt) : DEFAULT_DEBTS;
        const initLedger: LedgerEntry[] = lsLedg
          ? JSON.parse(lsLedg).map((l: LedgerEntry) => ({
              ...l,
              businessDay: l.businessDay || getBusinessDayKey()
            }))
          : [{ id: 1, type: 'INCOME', description: 'دفعة صيانة سابقة', amount: 25, date: new Date().toLocaleString('ar-EG'), businessDay: getBusinessDayKey(), user: 'admin' }];

        const parsedOldCreds = lsCreds ? JSON.parse(lsCreds) : {};
        const initCreds: AdminCreds = {
          username: parsedOldCreds.username || DEFAULT_CREDS.username,
          password: parsedOldCreds.password || DEFAULT_CREDS.password,
          profitsPassword: parsedOldCreds.profitsPassword || DEFAULT_CREDS.profitsPassword,
          rememberWord: parsedOldCreds.rememberWord || DEFAULT_CREDS.rememberWord,
          shopPhone: parsedOldCreds.shopPhone || DEFAULT_CREDS.shopPhone
        };

        setProducts(initProds);
        setRepairs(initReps);
        setDebts(initDebts);
        setLedger(initLedger);
        setAdminCreds(initCreds);
        setSettingsUser(initCreds.username);
        setSettingsPass(initCreds.password);
        setSettingsProfitsPass(initCreds.profitsPassword);
        setSettingsRemember(initCreds.rememberWord);
        setSettingsPhone(initCreds.shopPhone);
      } else {
        setProducts(savedProducts);
        setRepairs(savedRepairs || DEFAULT_REPAIRS);
        setDebts(savedDebts || DEFAULT_DEBTS);
        setLedger(savedLedger || []);
        setProfitEvents(savedProfitEvents || []);
        setProfitHistory(savedProfitHistory || []);
        const creds: AdminCreds = {
          username: savedCreds?.username || DEFAULT_CREDS.username,
          password: savedCreds?.password || DEFAULT_CREDS.password,
          profitsPassword: savedCreds?.profitsPassword || DEFAULT_CREDS.profitsPassword,
          rememberWord: savedCreds?.rememberWord || DEFAULT_CREDS.rememberWord,
          shopPhone: savedCreds?.shopPhone || DEFAULT_CREDS.shopPhone
        };
        setAdminCreds(creds);
        setSettingsUser(creds.username);
        setSettingsPass(creds.password);
        setSettingsProfitsPass(creds.profitsPassword);
        setSettingsRemember(creds.rememberWord);
        setSettingsPhone(creds.shopPhone);
        if (savedBizDay) setActiveBusinessDay(savedBizDay);
        if (typeof savedSound === 'boolean') setSoundEnabled(savedSound);
      }

      setIsDbReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isDbReady) return;
    idbSet('products', products);
    idbSet('repairs', repairs);
    idbSet('debts', debts);
    idbSet('ledger', ledger);
    idbSet('profitEvents', profitEvents);
    idbSet('profitHistory', profitHistory);
    idbSet('adminCreds', adminCreds);
    idbSet('activeBusinessDay', activeBusinessDay);
    idbSet('soundEnabled', soundEnabled);
  }, [isDbReady, products, repairs, debts, ledger, profitEvents, profitHistory, adminCreds, activeBusinessDay, soundEnabled]);

  // ============================================================================
  // 6. الصوت والبالون + ترحيل 6 صباحاً + التنقل المحمي لتبويب الأرباح
  // ============================================================================
  useEffect(() => {
    const onGlobalClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      const btn = target?.closest('button, [data-balloon="true"]') as HTMLElement | null;
      if (btn) {
        playPopSound(soundEnabled);
        btn.classList.remove('balloon-pop-active');
        void btn.offsetWidth;
        btn.classList.add('balloon-pop-active');
      }
    };
    document.addEventListener('click', onGlobalClick, true);
    return () => document.removeEventListener('click', onGlobalClick, true);
  }, [soundEnabled]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString('ar-EG'));
      setCurrentBusinessDay(getBusinessDayKey(now));
    };
    tick();
    const timer = setInterval(tick, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isDbReady || rolloverLockRef.current) return;
    if (activeBusinessDay !== currentBusinessDay) {
      rolloverLockRef.current = true;
      const daysToArchive = new Set<string>();
      if (activeBusinessDay < currentBusinessDay) daysToArchive.add(activeBusinessDay);
      profitEvents.forEach(ev => {
        if (ev.businessDay < currentBusinessDay) daysToArchive.add(ev.businessDay);
      });

      if (daysToArchive.size > 0) {
        setProfitHistory(prev => {
          const existingDates = new Set(prev.map(r => r.date));
          const additions: DailyProfitRecord[] = [];
          Array.from(daysToArchive)
            .sort()
            .forEach(dayKey => {
              if (existingDates.has(dayKey)) return;
              const dayEvents = profitEvents.filter(e => e.businessDay === dayKey);
              const salesProfit = dayEvents.filter(e => e.sourceType === 'SALE').reduce((s, e) => s + e.amount, 0);
              const repairProfit = dayEvents.filter(e => e.sourceType === 'REPAIR' || e.sourceType === 'PROGRAMMING').reduce((s, e) => s + e.amount, 0);
              const expenses = dayEvents.filter(e => e.sourceType === 'EXPENSE').reduce((s, e) => s + Math.abs(e.amount), 0);
              const netProfit = salesProfit + repairProfit - expenses;
              additions.push({
                id: 'PR-' + dayKey,
                date: dayKey,
                dayName: getArabicDayName(dayKey),
                periodLabel: '06:00 ص - 06:00 ص',
                salesProfit,
                repairProfit,
                expenses,
                netProfit
              });
            });
          return [...additions, ...prev].sort((a, b) => b.date.localeCompare(a.date));
        });
      }

      setActiveBusinessDay(currentBusinessDay);
      rolloverLockRef.current = false;
    }
  }, [isDbReady, activeBusinessDay, currentBusinessDay, profitEvents]);

  const navigateToTab = (tabId: string) => {
    if (tabId === 'profits') {
      if (!isProfitsUnlocked) {
        setProfitsUnlockInput('');
        setShowProfitsLockModal(true);
        return;
      }
      setActiveTab('profits');
      return;
    }
    setIsProfitsUnlocked(false);
    setActiveTab(tabId);
  };

  const handleUnlockProfits = (e: React.FormEvent) => {
    e.preventDefault();
    if (profitsUnlockInput === adminCreds.profitsPassword) {
      setIsProfitsUnlocked(true);
      setShowProfitsLockModal(false);
      setProfitsUnlockInput('');
      setActiveTab('profits');
    } else {
      alert('كلمة مرور الأرباح الخاصة غير صحيحة!');
    }
  };

  // ============================================================================
  // 7. الحسابات المالية ورأس المال المسجل بالمستودع والأرباح
  // ============================================================================
  const totalExpenses = useMemo(
    () => ledger.filter(l => l.type === 'EXPENSE').reduce((s, i) => s + i.amount, 0),
    [ledger]
  );
  const totalIncome = useMemo(
    () => ledger.filter(l => l.type === 'INCOME').reduce((s, i) => s + i.amount, 0),
    [ledger]
  );
  const totalDebts = useMemo(
    () => debts.reduce((s, d) => s + d.remainingAmount, 0),
    [debts]
  );
  // رأس المال المسجل بالمستودع = مجموع (رأس المال × الكمية) لكل المواد
  const inventoryCapital = useMemo(
    () => products.reduce((sum, p) => sum + p.cost * p.qty, 0),
    [products]
  );

  const liveTodayStats = useMemo(() => {
    const todayEvents = profitEvents.filter(e => e.businessDay === currentBusinessDay);
    const salesProfit = todayEvents.filter(e => e.sourceType === 'SALE').reduce((s, e) => s + e.amount, 0);
    const repairProfit = todayEvents.filter(e => e.sourceType === 'REPAIR' || e.sourceType === 'PROGRAMMING').reduce((s, e) => s + e.amount, 0);
    const expenses = todayEvents.filter(e => e.sourceType === 'EXPENSE').reduce((s, e) => s + Math.abs(e.amount), 0);
    const netProfit = salesProfit + repairProfit - expenses;
    return { salesProfit, repairProfit, expenses, netProfit };
  }, [profitEvents, currentBusinessDay]);

  const allProfitRows: DailyProfitRecord[] = useMemo(() => {
    const archivedWithoutToday = profitHistory.filter(r => r.date !== currentBusinessDay);
    const todayRow: DailyProfitRecord = {
      id: 'LIVE-' + currentBusinessDay,
      date: currentBusinessDay,
      dayName: `${getArabicDayName(currentBusinessDay)} (اليوم الحالي)`,
      periodLabel: '06:00 ص - 06:00 ص',
      salesProfit: liveTodayStats.salesProfit,
      repairProfit: liveTodayStats.repairProfit,
      expenses: liveTodayStats.expenses,
      netProfit: liveTodayStats.netProfit
    };
    return [todayRow, ...archivedWithoutToday].sort((a, b) => b.date.localeCompare(a.date));
  }, [profitHistory, currentBusinessDay, liveTodayStats]);

  const weekRange = useMemo(() => {
    return {
      from: getDateDaysAgoKey(6, currentBusinessDay),
      to: currentBusinessDay
    };
  }, [currentBusinessDay]);

  const lowStockProducts = useMemo(
    () => products.filter(p => p.qty <= p.minQty),
    [products]
  );

  // ============================================================================
  // 8. تسجيل الدخول واستعادة الحساب عبر كلمة التذكر
  // ============================================================================
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim() === adminCreds.username && passwordInput === adminCreds.password) {
      setIsAuthenticated(true);
      setIsProfitsUnlocked(false);
    } else {
      alert('خطأ: اسم المستخدم أو كلمة المرور غير صحيحة!');
    }
  };

  const handleVerifyRememberWord = () => {
    if (rememberInput.trim() === adminCreds.rememberWord.trim()) {
      setNewUsernameInput(adminCreds.username);
      setNewPasswordInput('');
      setForgotStep(2);
    } else {
      alert('كلمة التذكر غير صحيحة!');
    }
  };

  const handleResetCredentials = () => {
    if (!newUsernameInput.trim() || !newPasswordInput.trim()) {
      alert('يرجى إدخال اسم المستخدم وكلمة المرور الجديدة!');
      return;
    }
    const updated: AdminCreds = {
      ...adminCreds,
      username: newUsernameInput.trim(),
      password: newPasswordInput
    };
    setAdminCreds(updated);
    setSettingsUser(updated.username);
    setSettingsPass(updated.password);
    setUsernameInput(updated.username);
    setPasswordInput('');
    setShowForgotModal(false);
    setForgotStep(1);
    setRememberInput('');
    alert('تم تحديث اسم المستخدم وكلمة المرور بنجاح!');
  };

  // ============================================================================
  // 9. بوابة الحماية بكلمة السر لكل عمليات الحذف وتعديل المستودع وتفريغ الأرباح
  // ============================================================================
  const requestProtectedAction = (action: PendingProtectedAction) => {
    setPendingAction(action);
    setSecurityPassInput('');
    setShowSecurityModal(true);
  };

  const confirmProtectedAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingAction) return;

    const requiredPassword =
      pendingAction.kind === 'CLEAR_ALL_PROFITS' || pendingAction.kind === 'DELETE_PROFIT_ROW'
        ? adminCreds.profitsPassword
        : adminCreds.password;

    if (securityPassInput !== requiredPassword && securityPassInput !== adminCreds.password) {
      alert('كلمة السر غير صحيحة! تم رفض العملية.');
      setShowSecurityModal(false);
      setPendingAction(null);
      return;
    }

    if (pendingAction.kind === 'DELETE_PRODUCT') {
      setProducts(prev => prev.filter(p => p.id !== pendingAction.product.id));
      alert('تم حذف المادة من المستودع بنجاح.');
    } else if (pendingAction.kind === 'EDIT_PRODUCT') {
      const p = pendingAction.product;
      setEditingProduct(p);
      setProdName(p.name);
      setProdBarcode(p.barcode);
      setProdCat(p.category);
      setProdCostStr(String(p.cost));
      setProdPriceStr(String(p.price));
      setProdQtyStr(String(p.qty));
      setProdMinQtyStr(String(p.minQty));
      setIsProductModalOpen(true);
    } else if (pendingAction.kind === 'DELETE_REPAIR') {
      const ticket = pendingAction.repair;
      if (ticket.status !== 'CANCELLED' && ticket.partsDetail?.length) {
        setProducts(prev =>
          prev.map(p => {
            const used = ticket.partsDetail.find(u => u.productId === p.id);
            return used ? { ...p, qty: p.qty + used.qty } : p;
          })
        );
      }
      setRepairs(prev => prev.filter(r => r.id !== ticket.id));
      setLedger(prev => prev.filter(l => l.refId !== ticket.id));
      setDebts(prev => prev.filter(d => d.refId !== ticket.id));
      setProfitEvents(prev => prev.filter(pe => pe.refId !== ticket.id));
      alert('تم حذف الوصل وعكس قيوده بنجاح.');
    } else if (pendingAction.kind === 'CANCEL_REPAIR') {
      const ticket = pendingAction.repair;
      if (ticket.status !== 'CANCELLED') {
        if (ticket.partsDetail?.length) {
          setProducts(prev =>
            prev.map(p => {
              const used = ticket.partsDetail.find(u => u.productId === p.id);
              return used ? { ...p, qty: p.qty + used.qty } : p;
            })
          );
        }
        setRepairs(prev => prev.map(r => (r.id === ticket.id ? { ...r, status: 'CANCELLED' } : r)));
        setLedger(prev => prev.filter(l => l.refId !== ticket.id));
        setDebts(prev => prev.filter(d => d.refId !== ticket.id));
        setProfitEvents(prev => prev.filter(pe => pe.refId !== ticket.id));
        alert('تم إلغاء الوصل وإعادة قطع الغيار للمستودع بنجاح.');
      }
    } else if (pendingAction.kind === 'DELETE_DEBT') {
      setDebts(prev => prev.filter(d => d.id !== pendingAction.debt.id));
      alert('تم حذف سجل الدين بنجاح.');
    } else if (pendingAction.kind === 'DELETE_LEDGER') {
      const entry = pendingAction.entry;
      setLedger(prev => prev.filter(l => l.id !== entry.id));
      if (entry.type === 'EXPENSE') {
        setProfitEvents(prev => prev.filter(pe => pe.refId !== `EXP-${entry.id}`));
      }
      alert('تم حذف القيد المالي بنجاح.');
    } else if (pendingAction.kind === 'DELETE_PROFIT_ROW') {
      const row = pendingAction.row;
      if (row.id.startsWith('LIVE-')) {
        setProfitEvents(prev => prev.filter(pe => pe.businessDay !== row.date));
      } else {
        setProfitHistory(prev => prev.filter(r => r.id !== row.id));
      }
      alert('تم حذف سجل اليوم من الأرباح بنجاح.');
    } else if (pendingAction.kind === 'CLEAR_ALL_PROFITS') {
      setProfitEvents([]);
      setProfitHistory([]);
      alert('تم تفريغ قيمة جميع الأرباح وتصفيرها بنجاح!');
    }

    setShowSecurityModal(false);
    setPendingAction(null);
  };

  // ============================================================================
  // 10. دوال الطباعة الاحترافية (العلامة المائية "العلاش" + الترويسة والتذييل الثابتان)
  // ============================================================================
  const openPrintDocument = (title: string, bodyHtml: string) => {
    const win = window.open('', '_blank');
    if (!win) {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة.');
      return;
    }
    win.document.write(`
      <html lang="ar" dir="rtl">
      <head>
        <title>${title} - ${FIXED_SHOP_NAME}</title>
        <style>
          @page { size: A4; margin: 16mm; }
          * { box-sizing: border-box; }
          body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
            padding: 24px;
            color: #111827;
            max-width: 820px;
            margin: 0 auto;
            position: relative;
            background: #fff;
          }
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-32deg);
            font-size: 115px;
            font-weight: 900;
            color: rgba(122, 28, 36, 0.08);
            letter-spacing: 6px;
            pointer-events: none;
            user-select: none;
            z-index: 0;
            white-space: nowrap;
          }
          .content { position: relative; z-index: 1; }
          .header {
            text-align: center;
            border-bottom: 3px solid #7a1c24;
            padding-bottom: 14px;
            margin-bottom: 20px;
          }
          .shop-title { font-size: 28px; font-weight: 900; color: #7a1c24; margin: 0; }
          .shop-sub { font-size: 14px; color: #374151; margin: 6px 0 0; font-weight: 700; }
          .meta {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 10px;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 12px 16px;
            margin-bottom: 18px;
            font-size: 14px;
          }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 10px 12px; text-align: right; font-size: 14px; }
          th { background-color: #7a1c24; color: #fff; font-weight: 700; }
          .summary-box {
            margin-top: 18px;
            padding: 14px 18px;
            background: #fdf2f2;
            border: 1px solid #f3c4c7;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 800;
            color: #7a1c24;
            display: flex;
            justify-content: space-between;
          }
          .footer {
            text-align: center;
            margin-top: 44px;
            padding-top: 14px;
            border-top: 2px dashed #9ca3af;
            font-size: 13px;
            color: #374151;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <div class="watermark">${FIXED_SHOP_NAME}</div>
        <div class="content">
          <div class="header">
            <h1 class="shop-title">محل ${FIXED_SHOP_NAME} لصيانة وقطع غيار الهواتف</h1>
            <p class="shop-sub">الهاتف: ${adminCreds.shopPhone} | ${title}</p>
          </div>
          ${bodyHtml}
          <div class="footer">
            <div>محل ${FIXED_SHOP_NAME} — شكراً لتعاملكم معنا | هاتف: ${adminCreds.shopPhone}</div>
          </div>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  };

  // ============================================================================
  // 11. عمليات سلة المبيعات (POS)
  // ============================================================================
  const cartSearchMatches = useMemo(() => {
    const q = cartSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return products.filter(
      p => p.name.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q)
    );
  }, [cartSearchQuery, products]);

  const addToCart = (product: Product) => {
    setCartSearchError('');
    if (product.qty <= 0) {
      alert('عذراً، هذه القطعة نفدت من المستودع!');
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.qty + 1 > product.qty) {
          alert(`لا يمكن تجاوز الكمية المتوفرة (${product.qty})!`);
          return prev;
        }
        return prev.map(item =>
          item.productId === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          cost: product.cost,
          price: product.price,
          qty: 1
        }
      ];
    });
  };

  const handleCartSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = cartSearchQuery.trim();
    if (!q) return;
    const exact = products.find(
      p => p.barcode.toLowerCase() === q.toLowerCase() || p.name.toLowerCase() === q.toLowerCase()
    );
    const picked = exact || (cartSearchMatches.length === 1 ? cartSearchMatches[0] : null);
    if (!picked) {
      setCartSearchError('تنبيه: هذه المادة غير موجودة في المستودع! لا يمكن كتابتها أو إضافتها للفاتورة.');
      return;
    }
    addToCart(picked);
    setCartSearchQuery('');
    setCartSearchError('');
  };

  const updateCartItemQty = (productId: string, newQty: number) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    if (newQty <= 0) {
      setCart(prev => prev.filter(i => i.productId !== productId));
      return;
    }
    if (newQty > prod.qty) {
      alert(`الكمية المطلوبة (${newQty}) أكبر من المتوفر في المستودع (${prod.qty})!`);
      return;
    }
    setCart(prev => prev.map(i => (i.productId === productId ? { ...i, qty: newQty } : i)));
  };

  const updateCartItemPrice = (productId: string, newPrice: number) => {
    if (newPrice < 0) return;
    setCart(prev => prev.map(i => (i.productId === productId ? { ...i, price: newPrice } : i)));
  };

  const posDiscount = Math.max(0, parseDecimal(posDiscountStr));
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartFinalTotal = Math.max(0, cartSubtotal - posDiscount);
  const cartTotalCost = cart.reduce((sum, item) => sum + item.cost * item.qty, 0);
  const cartNetProfit = cartFinalTotal - cartTotalCost;

  const finalizePOSInvoice = (shouldPrint: boolean) => {
    if (cart.length === 0) {
      alert('السلة فارغة! يرجى اختيار مواد موجودة في المستودع أولاً.');
      return;
    }
    for (const item of cart) {
      const inv = products.find(p => p.id === item.productId);
      if (!inv) {
        alert(`المادة (${item.name}) غير موجودة في المستودع! لا يمكن إتمام الفاتورة.`);
        return;
      }
      if (item.qty > inv.qty) {
        alert(`الكمية المتوفرة من (${inv.name}) هي ${inv.qty} فقط!`);
        return;
      }
    }
    if (posPayType === 'DEBT' && !posCustName.trim()) {
      alert('يرجى كتابة اسم الزبون عند اختيار البيع الآجل (الدين)!');
      return;
    }

    const invoiceId = 'INV-' + Date.now();
    const bizDay = getBusinessDayKey();

    setProducts(prev =>
      prev.map(p => {
        const cItem = cart.find(c => c.productId === p.id);
        return cItem ? { ...p, qty: Math.max(0, Number((p.qty - cItem.qty).toFixed(3))) } : p;
      })
    );

    if (posPayType === 'CASH') {
      setLedger(prev => [
        ...prev,
        {
          id: Date.now(),
          refId: invoiceId,
          type: 'INCOME',
          description: `فاتورة مبيعات كاش #${invoiceId} (${posCustName.trim() || 'زبون عام'})`,
          amount: cartFinalTotal,
          date: new Date().toLocaleString('ar-EG'),
          businessDay: bizDay,
          user: adminCreds.username
        }
      ]);
    } else {
      setDebts(prev => [
        ...prev,
        {
          id: 'DB-' + Date.now(),
          refId: invoiceId,
          customerName: posCustName.trim(),
          phone: posCustPhone.trim() || 'غير محدد',
          source: `فاتورة مبيعات #${invoiceId} (${cart.length} أصناف)`,
          originalAmount: cartFinalTotal,
          remainingAmount: cartFinalTotal,
          date: new Date().toISOString().split('T')[0]
        }
      ]);
    }

    setProfitEvents(prev => [
      ...prev,
      {
        id: 'PE-' + Date.now(),
        refId: invoiceId,
        businessDay: bizDay,
        sourceType: 'SALE',
        amount: cartNetProfit,
        description: `ربح فاتورة مبيعات #${invoiceId}`,
        timestamp: new Date().toISOString()
      }
    ]);

    if (shouldPrint) {
      const rowsHtml = cart
        .map(
          (c, i) =>
            `<tr>
              <td>${i + 1}</td>
              <td>${c.name}</td>
              <td>${c.qty}</td>
              <td>$${formatMoney(c.price)}</td>
              <td>$${formatMoney(c.price * c.qty)}</td>
            </tr>`
        )
        .join('');
      openPrintDocument(
        `فاتورة مبيعات #${invoiceId}`,
        `
        <div class="meta">
          <div><b>رقم الفاتورة:</b> ${invoiceId}</div>
          <div><b>التاريخ:</b> ${new Date().toLocaleString('ar-EG')}</div>
          <div><b>الزبون:</b> ${posCustName.trim() || 'زبون عام'} (${posCustPhone.trim() || '-'})</div>
          <div><b>طريقة الدفع:</b> ${posPayType === 'CASH' ? 'نقدي (كاش)' : 'آجل (دين)'}</div>
        </div>
        <table>
          <thead>
            <tr><th>م</th><th>اسم الصنف</th><th>الكمية</th><th>السعر الفردي</th><th>الإجمالي</th></tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div class="summary-box">
          <span>الخصم: $${formatMoney(posDiscount)}</span>
          <span>الإجمالي النهائي: $${formatMoney(cartFinalTotal)}</span>
        </div>
        `
      );
    }

    setCart([]);
    setPosCustName('');
    setPosCustPhone('');
    setPosDiscountStr('0');
    alert(shouldPrint ? 'تم ترحيل الفاتورة وطباعتها بنجاح!' : 'تم حفظ الفاتورة وترحيلها بنجاح!');
  };

  // ============================================================================
  // 12. عمليات ورشة الصيانة (Maintenance)
  // ============================================================================
  const openNewRepairModal = () => {
    setEditingRepair(null);
    setRepCustName('');
    setRepCustPhone('');
    setRepModel('');
    setRepImei('');
    setRepFault('');
    setRepType('PARTS_AND_REPAIR');
    setRepFeeStr('0');
    setRepPayStatus('UNPAID');
    setRepStatus('WAITING');
    setRepParts([]);
    setSelectedPartId('');
    setIsRepairModalOpen(true);
  };

  const openEditRepairModal = (ticket: RepairTicket) => {
    setEditingRepair(ticket);
    setRepCustName(ticket.customerName);
    setRepCustPhone(ticket.phone);
    setRepModel(ticket.model);
    setRepImei(ticket.imei || '');
    setRepFault(ticket.fault);
    setRepType(ticket.repairType || 'PARTS_AND_REPAIR');
    setRepFeeStr(String(ticket.repairFee ?? ticket.cost));
    setRepPayStatus(ticket.paidStatus);
    setRepStatus(ticket.status);
    setRepParts(ticket.partsDetail || []);
    setSelectedPartId('');
    setIsRepairModalOpen(true);
  };

  const addPartToRepairForm = (productId: string) => {
    if (!productId) return;
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    const alreadyInEditing = editingRepair?.partsDetail?.find(x => x.productId === prod.id)?.qty || 0;
    const alreadyInCurrent = repParts.find(x => x.productId === prod.id)?.qty || 0;
    if (alreadyInCurrent + 1 > prod.qty + alreadyInEditing) {
      alert(`عذراً، الكمية المتوفرة من (${prod.name}) غير كافية!`);
      return;
    }
    setRepParts(prev => {
      const ex = prev.find(i => i.productId === prod.id);
      if (ex) {
        return prev.map(i => (i.productId === prod.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { productId: prod.id, name: prod.name, cost: prod.cost, price: prod.price, qty: 1 }];
    });
  };

  const repairCalculations = useMemo(() => {
    const fee = Math.max(0, parseDecimal(repFeeStr));
    if (repType === 'REPAIR_NO_PARTS' || repType === 'PROGRAMMING') {
      return {
        partsTotal: 0,
        partsProfit: 0,
        feeProfit: fee,
        totalCustomerCost: fee,
        totalProfit: fee
      };
    }
    const partsTotal = repParts.reduce((s, p) => s + p.price * p.qty, 0);
    const partsProfit = repParts.reduce((s, p) => s + (p.price - p.cost) * p.qty, 0);
    return {
      partsTotal,
      partsProfit,
      feeProfit: fee,
      totalCustomerCost: partsTotal + fee,
      totalProfit: partsProfit + fee
    };
  }, [repFeeStr, repType, repParts]);

  const printRepairReceipt = (ticket: RepairTicket) => {
    const typeLabel =
      ticket.repairType === 'PROGRAMMING'
        ? 'برمجة (سوفتوير)'
        : ticket.repairType === 'REPAIR_NO_PARTS'
          ? 'صيانة بدون تبديل قطعة'
          : 'تبديل قطع غيار + صيانة';
    openPrintDocument(
      `وصل صيانة #${ticket.id}`,
      `
      <div class="meta">
        <div><b>رقم الوصل:</b> ${ticket.id}</div>
        <div><b>التاريخ:</b> ${ticket.date}</div>
        <div><b>الزبون:</b> ${ticket.customerName} (${ticket.phone})</div>
        <div><b>الجهاز:</b> ${ticket.model} ${ticket.imei ? `- IMEI: ${ticket.imei}` : ''}</div>
        <div><b>نوع الخدمة:</b> ${typeLabel}</div>
        <div><b>حالة الدفع:</b> ${ticket.paidStatus === 'PAID' ? 'مدفوع كاش' : 'آجل / دين'}</div>
      </div>
      <table>
        <thead>
          <tr><th>البيان / العطل والقطع</th><th>التفاصيل</th></tr>
        </thead>
        <tbody>
          <tr><td><b>وصف العطل</b></td><td>${ticket.fault}</td></tr>
          <tr><td><b>القطع المستخدمة</b></td><td>${ticket.partsUsed.length ? ticket.partsUsed.join(' ، ') : 'لا يوجد'}</td></tr>
          <tr><td><b>أجور الصيانة / البرمجة</b></td><td>$${formatMoney(ticket.repairFee)}</td></tr>
        </tbody>
      </table>
      <div class="summary-box">
        <span>حالة الجهاز: ${ticket.status}</span>
        <span>الإجمالي المطلوب: $${formatMoney(ticket.cost)}</span>
      </div>
      `
    );
  };

  const saveAndPostRepair = (e: React.FormEvent, alsoPrint = false) => {
    e.preventDefault();
    if (!repCustName.trim() || !repCustPhone.trim() || !repModel.trim() || !repFault.trim()) {
      alert('يرجى تعبئة الحقول الأساسية!');
      return;
    }

    const activeParts = repType === 'PARTS_AND_REPAIR' ? repParts : [];
    const ticketId = editingRepair ? editingRepair.id : 'REP-' + Math.floor(100 + Math.random() * 900);
    const bizDay = editingRepair ? editingRepair.businessDay : getBusinessDayKey();

    setProducts(prev =>
      prev.map(p => {
        const oldUsed = editingRepair?.status !== 'CANCELLED'
          ? editingRepair?.partsDetail?.find(x => x.productId === p.id)?.qty || 0
          : 0;
        const newUsed = activeParts.find(x => x.productId === p.id)?.qty || 0;
        const updatedQty = Math.max(0, Number((p.qty + oldUsed - newUsed).toFixed(3)));
        return { ...p, qty: updatedQty };
      })
    );

    const newTicket: RepairTicket = {
      id: ticketId,
      customerName: repCustName.trim(),
      phone: repCustPhone.trim(),
      model: repModel.trim(),
      imei: repImei.trim(),
      fault: repFault.trim(),
      repairType: repType,
      repairFee: Math.max(0, parseDecimal(repFeeStr)),
      partsDetail: activeParts,
      partsUsed: activeParts.map(p => `${p.name} (×${p.qty})`),
      cost: repairCalculations.totalCustomerCost,
      profit: repairCalculations.totalProfit,
      paidStatus: repPayStatus,
      status: editingRepair ? repStatus : 'WAITING',
      date: editingRepair ? editingRepair.date : new Date().toISOString().split('T')[0],
      businessDay: bizDay
    };

    if (editingRepair) {
      setRepairs(prev => prev.map(r => (r.id === ticketId ? newTicket : r)));
    } else {
      setRepairs(prev => [newTicket, ...prev]);
    }

    const oldLedgerWithout = ledger.filter(l => l.refId !== ticketId);
    const oldDebtsWithout = debts.filter(d => d.refId !== ticketId);
    const oldProfitsWithout = profitEvents.filter(pe => pe.refId !== ticketId);

    if (newTicket.status !== 'CANCELLED') {
      if (repPayStatus === 'PAID') {
        setLedger([
          ...oldLedgerWithout,
          {
            id: Date.now(),
            refId: ticketId,
            type: 'INCOME',
            description: `${repType === 'PROGRAMMING' ? 'برمجة' : 'صيانة'} جهاز #${ticketId} (${repCustName.trim()})`,
            amount: newTicket.cost,
            date: new Date().toLocaleString('ar-EG'),
            businessDay: bizDay,
            user: adminCreds.username
          }
        ]);
        setDebts(oldDebtsWithout);
      } else {
        setLedger(oldLedgerWithout);
        setDebts([
          ...oldDebtsWithout,
          {
            id: 'DB-' + Date.now(),
            refId: ticketId,
            customerName: repCustName.trim(),
            phone: repCustPhone.trim(),
            source: `وصل صيانة (${repModel.trim()} - #${ticketId})`,
            originalAmount: newTicket.cost,
            remainingAmount: newTicket.cost,
            date: newTicket.date
          }
        ]);
      }

      setProfitEvents([
        ...oldProfitsWithout,
        {
          id: 'PE-' + Date.now(),
          refId: ticketId,
          businessDay: bizDay,
          sourceType: repType === 'PROGRAMMING' ? 'PROGRAMMING' : 'REPAIR',
          amount: newTicket.profit,
          description: `ربح وصل #${ticketId}`,
          timestamp: new Date().toISOString()
        }
      ]);
    } else {
      setLedger(oldLedgerWithout);
      setDebts(oldDebtsWithout);
      setProfitEvents(oldProfitsWithout);
    }

    setIsRepairModalOpen(false);
    if (alsoPrint) {
      printRepairReceipt(newTicket);
    }
    alert(editingRepair ? 'تم تعديل معلومات الوصل وترحيل الحسابات بنجاح!' : 'تم حفظ الوصل وترحيله بنجاح!');
  };

  // ============================================================================
  // 13. المستودع والديون والمصروفات وتصدير الإكسل والنسخ الاحتياطي
  // ============================================================================
  const saveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = Math.max(0, parseDecimal(prodCostStr));
    const price = Math.max(0, parseDecimal(prodPriceStr));
    const qty = Math.max(0, parseDecimal(prodQtyStr));
    const minQty = Math.max(0, parseDecimal(prodMinQtyStr));

    if (editingProduct) {
      setProducts(prev =>
        prev.map(p =>
          p.id === editingProduct.id
            ? { ...p, name: prodName.trim(), barcode: prodBarcode.trim() || p.barcode, category: prodCat, cost, price, qty, minQty }
            : p
        )
      );
      setEditingProduct(null);
      alert('تم تعديل بيانات المادة بنجاح!');
    } else {
      const newProd: Product = {
        id: 'p-' + Date.now(),
        barcode: prodBarcode.trim() || String(Math.floor(1000000 + Math.random() * 9000000)),
        name: prodName.trim(),
        category: prodCat,
        cost,
        price,
        qty,
        minQty
      };
      setProducts(prev => [newProd, ...prev]);
      alert('تمت إضافة المادة للمستودع بنجاح!');
    }
    setIsProductModalOpen(false);
  };

  const applyBulkMinQty = () => {
    const val = Math.max(0, parseDecimal(bulkMinQtyStr));
    setProducts(prev => prev.map(p => ({ ...p, minQty: val })));
    alert(`تم ضبط حد التنبيه لجميع المواد في المستودع عند الكمية (${val}).`);
  };

  const confirmDebtSettlement = (full: boolean) => {
    if (!activeDebtToSettle) return;
    setSettleError('');
    const entered = parseDecimal(settleAmountStr);
    const payAmt = full ? activeDebtToSettle.remainingAmount : entered;

    if (payAmt <= 0) {
      setSettleError('يرجى إدخال مبلغ صحيح أكبر من صفر!');
      return;
    }
    if (!full && payAmt > activeDebtToSettle.remainingAmount) {
      const msg = `تنبيه: المبلغ المدخل ($${formatMoney(payAmt)}) أكبر من المستحق على الزبون ($${formatMoney(activeDebtToSettle.remainingAmount)})! تم رفض العملية.`;
      setSettleError(msg);
      alert(msg);
      return;
    }

    const finalPay = Math.min(payAmt, activeDebtToSettle.remainingAmount);
    const newRemaining = Math.max(0, Number((activeDebtToSettle.remainingAmount - finalPay).toFixed(2)));

    setDebts(prev =>
      prev.map(d => (d.id === activeDebtToSettle.id ? { ...d, remainingAmount: newRemaining } : d))
    );
    setLedger(prev => [
      ...prev,
      {
        id: Date.now(),
        type: 'INCOME',
        description: `تسديد دين من الزبون (${activeDebtToSettle.customerName})`,
        amount: finalPay,
        date: new Date().toLocaleString('ar-EG'),
        businessDay: getBusinessDayKey(),
        user: adminCreds.username
      }
    ]);

    setIsSettleModalOpen(false);
    setActiveDebtToSettle(null);
    alert(`تم تسديد مبلغ $${formatMoney(finalPay)} بنجاح!`);
  };

  const addExpenseEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseDecimal(expenseAmountStr);
    if (!expenseDesc.trim() || amt <= 0) {
      alert('يرجى إدخال بيان المصروف ومبلغ صحيح أكبر من صفر!');
      return;
    }
    const entryId = Date.now();
    const bizDay = getBusinessDayKey();
    setLedger(prev => [
      ...prev,
      {
        id: entryId,
        type: 'EXPENSE',
        description: expenseDesc.trim(),
        amount: amt,
        date: new Date().toLocaleString('ar-EG'),
        businessDay: bizDay,
        user: adminCreds.username
      }
    ]);
    setProfitEvents(prev => [
      ...prev,
      {
        id: 'PE-EXP-' + entryId,
        refId: `EXP-${entryId}`,
        businessDay: bizDay,
        sourceType: 'EXPENSE',
        amount: -amt,
        description: expenseDesc.trim(),
        timestamp: new Date().toISOString()
      }
    ]);
    setExpenseDesc('');
    setExpenseAmountStr('');
    alert('تم تسجيل المصروف وخصمه من الأرباح بنجاح.');
  };

  const filteredProfitRows = useMemo(() => {
    return allProfitRows.filter(row => {
      const q = profitSearch.trim().toLowerCase();
      if (q && !row.dayName.toLowerCase().includes(q) && !row.date.includes(q)) {
        return false;
      }
      if (profitPeriodFilter === 'WEEK') return row.date >= weekRange.from && row.date <= weekRange.to;
      if (profitPeriodFilter === 'CUSTOM') {
        if (profitDateFrom && row.date < profitDateFrom) return false;
        if (profitDateTo && row.date > profitDateTo) return false;
      }
      return true;
    });
  }, [allProfitRows, profitSearch, profitPeriodFilter, profitDateFrom, profitDateTo, weekRange]);

  const profitSummary = useMemo(() => {
    const count = filteredProfitRows.length;
    const totalSales = filteredProfitRows.reduce((s, r) => s + r.salesProfit, 0);
    const totalRepairs = filteredProfitRows.reduce((s, r) => s + r.repairProfit, 0);
    const totalNet = filteredProfitRows.reduce((s, r) => s + r.netProfit, 0);
    const averageNet = count > 0 ? totalNet / count : 0;
    return { count, totalSales, totalRepairs, totalNet, averageNet };
  }, [filteredProfitRows]);

  const exportProfitsToExcel = () => {
    const headers = ['اليوم', 'التاريخ', 'الفترة', 'أرباح المبيعات', 'أرباح الصيانة والبرمجة', 'صافي الأرباح'];
    const rows = filteredProfitRows.map(r => [
      r.dayName,
      r.date,
      r.periodLabel,
      formatMoney(r.salesProfit),
      formatMoney(r.repairProfit),
      formatMoney(r.netProfit)
    ]);
    rows.push([
      'المجموع التلقائي',
      `${profitSummary.count} يوم`,
      '-',
      formatMoney(profitSummary.totalSales),
      formatMoney(profitSummary.totalRepairs),
      formatMoney(profitSummary.totalNet)
    ]);
    rows.push(['المتوسط اليومي', '-', '-', '-', '-', formatMoney(profitSummary.averageNet)]);

    const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AlAllash_Profits_${currentBusinessDay}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportBackup = () => {
    const backupData = {
      products, repairs, debts, ledger, profitEvents, profitHistory, adminCreds, activeBusinessDay,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AlAllash_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert('تم تحميل النسخة الاحتياطية بنجاح!');
  };

  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (confirm('هل أنت متأكد من استعادة هذه النسخة وتحديث بيانات البرنامج؟')) {
          if (data.products) setProducts(data.products);
          if (data.repairs) setRepairs(data.repairs);
          if (data.debts) setDebts(data.debts);
          if (data.ledger) setLedger(data.ledger);
          if (data.profitEvents) setProfitEvents(data.profitEvents);
          if (data.profitHistory) setProfitHistory(data.profitHistory);
          if (data.adminCreds) {
            setAdminCreds(data.adminCreds);
            setSettingsUser(data.adminCreds.username);
            setSettingsPass(data.adminCreds.password);
            setSettingsProfitsPass(data.adminCreds.profitsPassword || '1234');
            setSettingsRemember(data.adminCreds.rememberWord || 'العلاش');
            setSettingsPhone(data.adminCreds.shopPhone || '07700000000');
          }
          alert('تمت استعادة البيانات بنجاح!');
        }
      } catch {
        alert('ملف النسخة الاحتياطية غير صالح!');
      }
    };
    reader.readAsText(file);
  };

  // ============================================================================
  // 14. تنسيقات الـ CSS المضمنة
  // ============================================================================
  const globalStyles = `
    @keyframes float3D {
      0%, 100% { transform: perspective(500px) rotateX(8deg) rotateY(-10deg) translateY(0px); }
      50% { transform: perspective(500px) rotateX(-8deg) rotateY(10deg) translateY(-3px); }
    }
    .logo-3d {
      display: inline-block;
      font-weight: 900;
      letter-spacing: 1px;
      animation: float3D 4s ease-in-out infinite;
      text-shadow:
        0 1px 0 #5b1218,
        0 2px 0 #4f0f14,
        0 3px 0 #420b10,
        0 4px 0 #36080c,
        0 6px 12px rgba(0, 0, 0, 0.45);
    }
    @keyframes dhikrBlink {
      0%, 100% {
        opacity: 1;
        text-shadow: 0 0 8px rgba(253, 224, 71, 0.85), 0 0 18px rgba(255, 255, 255, 0.4);
      }
      50% {
        opacity: 0.48;
        text-shadow: 0 0 2px rgba(253, 224, 71, 0.25);
      }
    }
    .dhikr-flash {
      animation: dhikrBlink 2.2s ease-in-out infinite;
    }
    @keyframes balloonPop {
      0% { transform: scale(1); }
      30% { transform: scale(0.91, 1.08); }
      65% { transform: scale(1.06, 0.94); }
      100% { transform: scale(1); }
    }
    button {
      transition: transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.16s ease, background-color 0.16s ease;
    }
    button:active {
      transform: scale(0.92, 1.07);
    }
    .balloon-pop-active {
      animation: balloonPop 0.34s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .app-watermark {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .app-watermark span {
      font-size: clamp(80px, 18vw, 180px);
      font-weight: 900;
      color: rgba(122, 28, 36, 0.05);
      transform: rotate(-28deg);
      user-select: none;
      white-space: nowrap;
    }
  `;

  // ============================================================================
  // 15. شاشة تسجيل الدخول
  // ============================================================================
  if (!isAuthenticated) {
    return (
      <div
        onKeyDown={handleEnterKeyNavigation}
        className="min-h-screen flex flex-col bg-[#7a1c24] text-white font-['Cairo',sans-serif] relative overflow-y-auto"
        dir="rtl"
      >
        <style>{globalStyles}</style>
        <div className="app-watermark">
          <span style={{ color: 'rgba(255,255,255,0.06)' }}>{FIXED_SHOP_NAME}</span>
        </div>

        <div className="w-full bg-[#581016] border-b border-amber-300/30 py-2 px-4 text-center relative z-10 shrink-0">
          <p className="text-sm sm:text-base font-black text-amber-200 dhikr-flash">{DHIKR_TEXT}</p>
        </div>

        <div className="flex-1 flex items-center justify-center p-4 relative z-10">
          <div className="w-full max-w-md bg-white text-slate-800 rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-3 bg-[#7a1c24] rounded-2xl flex items-center justify-center shadow-lg text-white">
                <Smartphone className="w-10 h-10" />
              </div>
              <h1 className="text-3xl font-black text-[#7a1c24] logo-3d" style={{ textShadow: '0 2px 0 #e5e7eb, 0 4px 8px rgba(122,28,36,0.25)' }}>
                {FIXED_SHOP_NAME}
              </h1>
              <p className="text-sm text-gray-500 mt-2 font-semibold">نظام إدارة المبيعات والصيانة والحسابات (بدون إنترنت)</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">اسم المستخدم</label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value)}
                  required
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-3.5 text-base focus:outline-none focus:border-[#7a1c24]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-sm font-bold text-gray-700">كلمة المرور</label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep(1);
                      setRememberInput('');
                      setShowForgotModal(true);
                    }}
                    className="text-sm font-bold text-[#7a1c24] hover:underline"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  required
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl p-3.5 text-base focus:outline-none focus:border-[#7a1c24]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-[#7a1c24] hover:bg-[#63141c] text-white font-bold rounded-xl text-base shadow-lg"
              >
                تسجيل الدخول للنظام
              </button>
            </form>
          </div>

          {showForgotModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div onKeyDown={handleEnterKeyNavigation} className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 text-slate-800 shadow-2xl">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-bold text-base text-[#7a1c24] flex items-center gap-2">
                    <KeyRound className="w-5 h-5" /> استعادة وتعديل الحساب
                  </h3>
                  <button type="button" onClick={() => setShowForgotModal(false)}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {forgotStep === 1 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">أدخل <b>كلمة التذكر</b> الخاصة بك لتتمكن من تغيير اسم المستخدم وكلمة المرور:</p>
                    <input
                      type="text"
                      placeholder="أدخل كلمة التذكر..."
                      value={rememberInput}
                      onChange={e => setRememberInput(e.target.value)}
                      autoFocus
                      className="w-full bg-gray-50 border-2 border-gray-300 rounded-xl p-3 text-base"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyRememberWord}
                      className="w-full py-3 bg-[#7a1c24] text-white font-bold rounded-xl text-sm"
                    >
                      تحقق من كلمة التذكر
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-emerald-700 font-bold">تم التحقق بنجاح! أدخل البيانات الجديدة:</p>
                    <div>
                      <label className="block text-xs font-bold mb-1">اسم المستخدم الجديد</label>
                      <input
                        type="text"
                        value={newUsernameInput}
                        onChange={e => setNewUsernameInput(e.target.value)}
                        className="w-full bg-gray-50 border-2 border-gray-300 rounded-xl p-3 text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">كلمة المرور الجديدة</label>
                      <input
                        type="password"
                        placeholder="كلمة المرور الجديدة"
                        value={newPasswordInput}
                        onChange={e => setNewPasswordInput(e.target.value)}
                        className="w-full bg-gray-50 border-2 border-gray-300 rounded-xl p-3 text-base"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleResetCredentials}
                      className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl text-sm"
                    >
                      حفظ اسم المستخدم وكلمة السر
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 16. واجهة البرنامج الرئيسية
  // ============================================================================
  return (
    <div
      onKeyDown={handleEnterKeyNavigation}
      className="h-screen flex flex-col overflow-hidden bg-slate-100 text-slate-800 font-['Cairo',sans-serif] antialiased relative"
      dir="rtl"
    >
      <style>{globalStyles}</style>

      <div className="app-watermark">
        <span>{FIXED_SHOP_NAME}</span>
      </div>

      {/* شريط الذكر الوامض في أعلى البرنامج */}
      <div className="w-full bg-[#581016] text-amber-200 py-1.5 px-4 text-center border-b border-amber-300/30 shrink-0 z-30">
        <p className="text-xs sm:text-sm font-black dhikr-flash">{DHIKR_TEXT}</p>
      </div>

      {/* الترويسة العلوية مع شعار 3D متحرك */}
      <header className="bg-[#7a1c24] text-white px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-lg shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-white/15 rounded-2xl flex items-center justify-center shadow-inner">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl sm:text-3xl logo-3d text-white">{FIXED_SHOP_NAME}</span>
              <span className="text-[11px] bg-white/20 px-2.5 py-0.5 rounded-full font-bold">Offline 4.0</span>
            </div>
            <div className="text-xs text-white/85 flex items-center gap-2">
              <span>اليوم: {currentBusinessDay} (06:00 ص - 06:00 ص)</span>
              <span>•</span>
              <span>{currentTimeStr}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled(s => !s)}
            title={soundEnabled ? 'كتم الصوت' : 'تفعيل الصوت'}
            className="p-2 bg-white/15 hover:bg-white/25 rounded-xl transition"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsProfitsUnlocked(false);
              setIsAuthenticated(false);
            }}
            className="px-3.5 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-sm font-bold"
          >
            تسجيل خروج
          </button>
        </div>
      </header>

      {/* منطقة المحتوى */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-5 pb-6 max-w-6xl mx-auto w-full space-y-4 relative z-10">

        {/* شريط علوي ثابت داخل كل تبويب يحتوي على زر "خروج" للعودة للرئيسية */}
        {activeTab !== 'home' && (
          <div className="bg-white px-4 py-3 rounded-2xl shadow-sm border-2 border-[#7a1c24]/15 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-7 bg-[#7a1c24] rounded-full inline-block" />
              <h2 className="font-black text-base sm:text-lg text-[#7a1c24]">
                {TAB_TITLES[activeTab] || 'القسم'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigateToTab('home')}
              className="px-5 py-2 bg-[#7a1c24] hover:bg-[#5f141b] text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow"
            >
              <ArrowRight className="w-4 h-4" /> خروج
            </button>
          </div>
        )}

        {/* ==================== الرئيسية ==================== */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            <div className="bg-[#7a1c24] text-white p-5 rounded-3xl shadow-xl flex items-center justify-between gap-4">
              <div>
                <h2 className="font-black text-lg sm:text-xl mb-1">مرحباً بك في نظام محل {FIXED_SHOP_NAME}</h2>
                <p className="text-sm text-white/90">
                  رأس المال (المستودع): <b className="text-lg text-emerald-300">${formatMoney(inventoryCapital)}</b>
                  {' | '}
                  رصيد الديون: <b className="text-lg text-amber-300">${formatMoney(totalDebts)}</b>
                </p>
              </div>
              <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center shrink-0">
                <Boxes className="w-8 h-8 text-white" />
              </div>
            </div>

            {lowStockProducts.length > 0 && (
              <div
                onClick={() => navigateToTab('inventory')}
                className="bg-rose-50 border-2 border-rose-300 text-rose-800 p-3.5 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-rose-100"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
                  <div>
                    <p className="font-bold text-sm">تنبيه نفاذ الكمية في المستودع! ({lowStockProducts.length} مواد)</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-rose-600 text-white rounded-xl text-xs font-bold">عرض</span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
              <button type="button" onClick={() => navigateToTab('pos')} className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border-2 border-gray-200 hover:border-[#7a1c24] flex flex-col items-center text-center group">
                <div className="w-14 h-14 bg-[#7a1c24]/10 text-[#7a1c24] rounded-2xl flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <span className="font-bold text-base text-slate-800">سلة المبيعات</span>
              </button>

              <button type="button" onClick={() => navigateToTab('maintenance')} className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border-2 border-gray-200 hover:border-[#7a1c24] flex flex-col items-center text-center group">
                <div className="w-14 h-14 bg-[#7a1c24]/10 text-[#7a1c24] rounded-2xl flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                  <Wrench className="w-7 h-7" />
                </div>
                <span className="font-bold text-base text-slate-800">ورشة الصيانة</span>
              </button>

              <button type="button" onClick={() => navigateToTab('inventory')} className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border-2 border-gray-200 hover:border-[#7a1c24] flex flex-col items-center text-center group">
                <div className="w-14 h-14 bg-[#7a1c24]/10 text-[#7a1c24] rounded-2xl flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                  <Boxes className="w-7 h-7" />
                </div>
                <span className="font-bold text-base text-slate-800">إدارة المستودع</span>
              </button>

              <button type="button" onClick={() => navigateToTab('debts')} className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border-2 border-gray-200 hover:border-[#7a1c24] flex flex-col items-center text-center group">
                <div className="w-14 h-14 bg-amber-500/15 text-amber-600 rounded-2xl flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                  <CreditCard className="w-7 h-7" />
                </div>
                <span className="font-bold text-base text-slate-800">الديون والأمانات</span>
              </button>

              <button type="button" onClick={() => navigateToTab('finance')} className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border-2 border-gray-200 hover:border-[#7a1c24] flex flex-col items-center text-center group">
                <div className="w-14 h-14 bg-emerald-500/15 text-emerald-600 rounded-2xl flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                  <Wallet className="w-7 h-7" />
                </div>
                <span className="font-bold text-base text-slate-800">الصندوق والحسابات</span>
              </button>

              <button type="button" onClick={() => navigateToTab('profits')} className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border-2 border-indigo-200 hover:border-[#7a1c24] flex flex-col items-center text-center group relative">
                <span className="absolute top-2.5 left-2.5 bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> محمي
                </span>
                <div className="w-14 h-14 bg-indigo-500/15 text-indigo-600 rounded-2xl flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <span className="font-bold text-base text-slate-800">الأرباح</span>
              </button>

              <button type="button" onClick={() => navigateToTab('settings')} className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border-2 border-gray-200 hover:border-[#7a1c24] flex flex-col items-center text-center group">
                <div className="w-14 h-14 bg-slate-500/15 text-slate-700 rounded-2xl flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                  <Settings className="w-7 h-7" />
                </div>
                <span className="font-bold text-base text-slate-800">إعدادات النظام</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================== 1. سلة المبيعات (POS) ==================== */}
        {activeTab === 'pos' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="w-5 h-5 text-gray-400 absolute right-3 top-3" />
                  <input
                    type="text"
                    value={posSearch}
                    onChange={e => setPosSearch(e.target.value)}
                    placeholder="فلترة المواد في الشبكة بالاسم أو الباركود..."
                    className="w-full bg-gray-50 border rounded-xl pr-10 pl-3 py-2.5 text-sm"
                  />
                </div>
                <select
                  value={posCategory}
                  onChange={e => setPosCategory(e.target.value)}
                  className="bg-gray-50 border rounded-xl px-4 py-2.5 text-sm font-bold"
                >
                  <option value="ALL">الكل</option>
                  <option value="شاشات">شاشات</option>
                  <option value="بطاريات">بطاريات</option>
                  <option value="شواحن وكوابل">شواحن وكوابل</option>
                  <option value="كفرات ولاصقات">كفرات ولاصقات</option>
                  <option value="قطع صيانة">قطع صيانة</option>
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                {products
                  .filter(
                    p =>
                      (p.name.toLowerCase().includes(posSearch.toLowerCase()) || p.barcode.includes(posSearch)) &&
                      (posCategory === 'ALL' || p.category === posCategory)
                  )
                  .map(p => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="bg-white p-4 rounded-2xl shadow-sm border-2 border-gray-100 hover:border-[#7a1c24] text-right flex flex-col justify-between"
                    >
                      <div className="w-full">
                        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                          <span>{p.category}</span>
                          <span className={p.qty <= p.minQty ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
                            متوفر: {p.qty}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-800 line-clamp-2">{p.name}</h4>
                      </div>
                      <div className="mt-3 pt-2 border-t w-full flex justify-between items-center">
                        <span className="font-black text-[#7a1c24] text-base">${formatMoney(p.price)}</span>
                        <div className="p-1.5 bg-[#7a1c24]/10 text-[#7a1c24] rounded-lg">
                          <Plus className="w-4 h-4" />
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-md border-2 border-[#7a1c24]/20 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b">
                  <h3 className="font-black text-base text-[#7a1c24] flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5" /> سلة المبيعات
                  </h3>
                  <button type="button" onClick={() => setCart([])} className="text-xs font-bold text-rose-600 hover:underline">
                    تفريغ السلة
                  </button>
                </div>

                <form onSubmit={handleCartSearchSubmit} className="relative space-y-1.5">
                  <div className="flex gap-1.5">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
                      <input
                        type="text"
                        data-enter-action="search-add"
                        value={cartSearchQuery}
                        onChange={e => {
                          setCartSearchQuery(e.target.value);
                          setCartSearchError('');
                        }}
                        placeholder="ابحث عن مادة لإضافتها للفاتورة..."
                        className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl pr-9 pl-3 py-2 text-sm focus:border-[#7a1c24] focus:outline-none"
                      />
                    </div>
                    <button type="submit" className="px-3 py-2 bg-[#7a1c24] text-white rounded-xl text-xs font-bold">
                      إضافة
                    </button>
                  </div>

                  {cartSearchError && (
                    <div className="p-2 bg-rose-50 border border-rose-300 text-rose-700 rounded-xl text-xs font-bold">
                      {cartSearchError}
                    </div>
                  )}

                  {cartSearchQuery.trim() !== '' && (
                    <div className="bg-white border-2 border-gray-200 rounded-xl max-h-40 overflow-y-auto shadow-lg divide-y">
                      {cartSearchMatches.length > 0 ? (
                        cartSearchMatches.map(m => (
                          <button
                            type="button"
                            key={m.id}
                            onClick={() => {
                              addToCart(m);
                              setCartSearchQuery('');
                              setCartSearchError('');
                            }}
                            className="w-full text-right px-3 py-2 hover:bg-gray-50 flex justify-between items-center text-xs"
                          >
                            <span className="font-bold text-slate-800">{m.name}</span>
                            <span className="text-[#7a1c24] font-bold">${formatMoney(m.price)} (متوفر: {m.qty})</span>
                          </button>
                        ))
                      ) : (
                        <div className="p-2.5 text-xs text-rose-600 font-bold text-center">
                          المادة غير موجودة في المستودع — لا يمكن كتابتها في الفاتورة!
                        </div>
                      )}
                    </div>
                  )}
                </form>

                <div className="space-y-2.5 max-h-60 overflow-y-auto">
                  {cart.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-6">السلة فارغة — ابحث أو اختر مادة</p>
                  )}
                  {cart.map(item => (
                    <div key={item.productId} className="p-3 bg-gray-50 rounded-2xl border space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-bold text-sm text-slate-800">{item.name}</p>
                        <button type="button" onClick={() => updateCartItemQty(item.productId, 0)} className="text-rose-500 p-1">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-gray-500 mb-0.5 font-bold">العدد</label>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => updateCartItemQty(item.productId, Number((item.qty - 1).toFixed(3)))} className="w-7 h-7 bg-gray-200 rounded-lg font-bold">-</button>
                            <input
                              type="number"
                              step="any"
                              value={item.qty}
                              onChange={e => updateCartItemQty(item.productId, parseDecimal(e.target.value))}
                              className="w-14 text-center bg-white border rounded-lg py-1 font-bold"
                            />
                            <button type="button" onClick={() => updateCartItemQty(item.productId, Number((item.qty + 1).toFixed(3)))} className="w-7 h-7 bg-gray-200 rounded-lg font-bold">+</button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-gray-500 mb-0.5 font-bold">السعر ($)</label>
                          <input
                            type="number"
                            step="any"
                            value={item.price}
                            onChange={e => updateCartItemPrice(item.productId, parseDecimal(e.target.value))}
                            className="w-full bg-white border rounded-lg px-2 py-1 font-bold text-[#7a1c24]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>المجموع:</span>
                  <span className="font-bold">${formatMoney(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span>الخصم ($):</span>
                  <input
                    type="number"
                    step="any"
                    value={posDiscountStr}
                    onChange={e => setPosDiscountStr(e.target.value)}
                    className="w-24 bg-gray-50 border rounded-lg py-1 text-center font-bold text-[#7a1c24]"
                  />
                </div>
                <div className="flex justify-between font-black text-lg text-slate-900 pt-2 border-t">
                  <span>الإجمالي النهائي:</span>
                  <span className="text-[#7a1c24]">${formatMoney(cartFinalTotal)}</span>
                </div>

                <div className="p-3 bg-gray-50 rounded-2xl border space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPosPayType('CASH')}
                      className={`p-2 rounded-xl border text-center font-bold text-xs ${posPayType === 'CASH' ? 'bg-[#7a1c24] text-white border-[#7a1c24]' : 'bg-white text-gray-700'}`}
                    >
                      نقدي كاش
                    </button>
                    <button
                      type="button"
                      onClick={() => setPosPayType('DEBT')}
                      className={`p-2 rounded-xl border text-center font-bold text-xs ${posPayType === 'DEBT' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-700'}`}
                    >
                      آجل / دين
                    </button>
                  </div>
                  <input type="text" value={posCustName} onChange={e => setPosCustName(e.target.value)} placeholder="اسم الزبون (إلزامي في الدين)" className="w-full bg-white border rounded-xl p-2 text-sm" />
                  <input type="text" value={posCustPhone} onChange={e => setPosCustPhone(e.target.value)} placeholder="رقم هاتف الزبون (اختياري)" className="w-full bg-white border rounded-xl p-2 text-sm" />
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <button type="button" onClick={() => finalizePOSInvoice(false)} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow flex items-center justify-center gap-2 text-sm">
                    <CheckCircle className="w-5 h-5" /> حفظ الفاتورة وترحيلها
                  </button>
                  <button type="button" onClick={() => finalizePOSInvoice(true)} className="w-full py-3 bg-[#7a1c24] hover:bg-[#63141c] text-white font-bold rounded-xl shadow flex items-center justify-center gap-2 text-sm">
                    <Printer className="w-5 h-5" /> طباعة الفاتورة وترحيلها (A4)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 2. ورشة الصيانة (Maintenance) ==================== */}
        {activeTab === 'maintenance' && (
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center bg-white p-5 rounded-2xl shadow-sm border gap-3">
              <div>
                <h3 className="font-black text-base text-slate-800">ورشة الصيانة والبرمجة وتصليح الأجهزة</h3>
                <p className="text-xs text-gray-500">حساب آلي للأرباح: ربح القطعة (البيع - رأس المال) + أجور الصيانة/البرمجة (ربح 100%)</p>
              </div>
              <button type="button" onClick={openNewRepairModal} className="px-5 py-3 bg-[#7a1c24] text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow">
                <PlusCircle className="w-5 h-5" /> استلام جهاز جديد
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border overflow-x-auto">
              <table className="w-full text-right text-sm text-slate-700">
                <thead className="bg-gray-50 border-b text-gray-600">
                  <tr>
                    <th className="p-3.5">الوصل</th>
                    <th className="p-3.5">الزبون والهاتف</th>
                    <th className="p-3.5">الجهاز والنوع</th>
                    <th className="p-3.5">العطل والقطع</th>
                    <th className="p-3.5">الإجمالي</th>
                    <th className="p-3.5">الربح الصافي</th>
                    <th className="p-3.5">الحالة</th>
                    <th className="p-3.5 text-center">الخيارات الأربعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {repairs.map(r => (
                    <tr key={r.id} className={`hover:bg-gray-50 ${r.status === 'CANCELLED' ? 'opacity-60 bg-rose-50/40' : ''}`}>
                      <td className="p-3.5 font-bold text-[#7a1c24]">{r.id}</td>
                      <td className="p-3.5">
                        <div className="font-bold">{r.customerName}</div>
                        <div className="text-xs text-gray-500">{r.phone}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold">{r.model}</div>
                        <div className="text-xs text-[#7a1c24] font-semibold">
                          {r.repairType === 'PROGRAMMING' ? 'برمجة (100% ربح)' : r.repairType === 'REPAIR_NO_PARTS' ? 'صيانة بدون قطعة' : 'تبديل قطعة + صيانة'}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div>{r.fault}</div>
                        <div className="text-xs text-gray-400">{r.partsUsed.join(' ، ')}</div>
                      </td>
                      <td className="p-3.5 font-bold">${formatMoney(r.cost)}</td>
                      <td className="p-3.5 font-black text-emerald-600">${formatMoney(r.profit)}</td>
                      <td className="p-3.5">
                        <select
                          disabled={r.status === 'CANCELLED'}
                          value={r.status}
                          onChange={e => {
                            const val = e.target.value as RepairTicket['status'];
                            setRepairs(prev => prev.map(item => (item.id === r.id ? { ...item, status: val } : item)));
                          }}
                          className="bg-gray-50 border text-xs rounded-lg p-1.5 font-bold text-[#7a1c24]"
                        >
                          <option value="WAITING">قيد الانتظار</option>
                          <option value="FIXING">قيد الإصلاح</option>
                          <option value="COMPLETED">مكتمل وجاهز</option>
                          <option value="DELIVERED">تم التسليم</option>
                          <option value="CANCELLED">ملغى</option>
                        </select>
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          <button type="button" onClick={() => openEditRepairModal(r)} className="px-2.5 py-1.5 bg-cyan-50 text-cyan-800 border border-cyan-200 rounded-lg text-xs font-bold flex items-center gap-1">
                            <Edit3 className="w-3.5 h-3.5" /> تعديل
                          </button>
                          <button type="button" onClick={() => printRepairReceipt(r)} className="px-2.5 py-1.5 bg-[#7a1c24]/10 text-[#7a1c24] border border-[#7a1c24]/20 rounded-lg text-xs font-bold flex items-center gap-1">
                            <Printer className="w-3.5 h-3.5" /> طباعة
                          </button>
                          {r.status !== 'CANCELLED' && (
                            <button type="button" onClick={() => requestProtectedAction({ kind: 'CANCEL_REPAIR', repair: r })} className="px-2.5 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1">
                              <Ban className="w-3.5 h-3.5" /> إلغاء
                            </button>
                          )}
                          <button type="button" onClick={() => requestProtectedAction({ kind: 'DELETE_REPAIR', repair: r })} className="px-2.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1">
                            <Trash2 className="w-3.5 h-3.5" /> حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== 3. المستودع (Inventory) ==================== */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border-2 border-amber-300 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-rose-700">
                  <AlertTriangle className="w-6 h-6 shrink-0" />
                  <div>
                    <h3 className="font-black text-base">تنبيهات نفاذ الكمية في المستودع ({lowStockProducts.length})</h3>
                    <p className="text-xs text-gray-600">تظهر هنا المواد التي وصلت أو انخفضت عن حد التنبيه المحدد.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                  <label className="text-xs font-bold text-amber-900">تعديل حد التنبيه العام لكل المواد:</label>
                  <input type="number" step="any" value={bulkMinQtyStr} onChange={e => setBulkMinQtyStr(e.target.value)} className="w-16 bg-white border rounded-lg p-1 text-center font-bold text-sm" />
                  <button type="button" onClick={applyBulkMinQty} className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold">تطبيق</button>
                </div>
              </div>

              {lowStockProducts.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {lowStockProducts.map(lp => (
                    <span key={lp.id} className="px-3 py-1.5 bg-rose-100 border border-rose-300 text-rose-800 rounded-xl text-xs font-bold">
                      {lp.name} — المتبقي: {lp.qty} (حد التنبيه: {lp.minQty})
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-bold text-emerald-700">جميع المواد في المستودع فوق حد التنبيه حالياً.</p>
              )}
            </div>

            <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-2xl shadow-sm border gap-3">
              <div className="flex gap-2 flex-1 min-w-[220px]">
                <input type="text" value={inventorySearch} onChange={e => setInventorySearch(e.target.value)} placeholder="بحث في المستودع..." className="bg-gray-50 border rounded-xl px-3 py-2.5 text-sm w-full max-w-xs" />
                <select value={inventoryCatFilter} onChange={e => setInventoryCatFilter(e.target.value)} className="bg-gray-50 border rounded-xl px-3 py-2.5 text-sm font-bold">
                  <option value="ALL">جميع التصنيفات</option>
                  <option value="شاشات">شاشات</option>
                  <option value="بطاريات">بطاريات</option>
                  <option value="شواحن وكوابل">شواحن وكوابل</option>
                  <option value="كفرات ولاصقات">كفرات ولاصقات</option>
                  <option value="قطع صيانة">قطع صيانة</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setProdName('');
                  setProdBarcode('');
                  setProdCat('شاشات');
                  setProdCostStr('0');
                  setProdPriceStr('0');
                  setProdQtyStr('1');
                  setProdMinQtyStr('3');
                  setIsProductModalOpen(true);
                }}
                className="px-5 py-3 bg-[#7a1c24] text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow"
              >
                <PlusCircle className="w-5 h-5" /> إضافة مادة للمستودع
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border overflow-x-auto">
              <table className="w-full text-right text-sm text-slate-700">
                <thead className="bg-gray-50 border-b text-gray-600">
                  <tr>
                    <th className="p-3.5">#</th>
                    <th className="p-3.5">اسم المادة</th>
                    <th className="p-3.5">التصنيف</th>
                    <th className="p-3.5">رأس المال</th>
                    <th className="p-3.5">البيع</th>
                    <th className="p-3.5">الكمية</th>
                    <th className="p-3.5">حد التنبيه (قابل للتعديل)</th>
                    <th className="p-3.5 text-center">إجراءات محمية</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products
                    .filter(
                      p =>
                        (p.name.toLowerCase().includes(inventorySearch.toLowerCase()) || p.barcode.includes(inventorySearch)) &&
                        (inventoryCatFilter === 'ALL' || p.category === inventoryCatFilter)
                    )
                    .map((p, idx) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="p-3.5 font-mono text-gray-400">{idx + 1}</td>
                        <td className="p-3.5 font-bold text-slate-800">{p.name}</td>
                        <td className="p-3.5 text-[#7a1c24] font-semibold">{p.category}</td>
                        <td className="p-3.5">${formatMoney(p.cost)}</td>
                        <td className="p-3.5 font-bold text-emerald-700">${formatMoney(p.price)}</td>
                        <td className={`p-3.5 font-black ${p.qty <= p.minQty ? 'text-rose-600' : 'text-slate-800'}`}>{p.qty}</td>
                        <td className="p-3.5">
                          <input
                            type="number"
                            step="any"
                            value={p.minQty}
                            onChange={e => {
                              const val = Math.max(0, parseDecimal(e.target.value));
                              setProducts(prev => prev.map(item => (item.id === p.id ? { ...item, minQty: val } : item)));
                            }}
                            className="w-20 bg-gray-50 border rounded-lg px-2 py-1 text-center font-bold"
                          />
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center justify-center gap-2">
                            <button type="button" onClick={() => requestProtectedAction({ kind: 'EDIT_PRODUCT', product: p })} className="px-3 py-1.5 bg-cyan-50 text-cyan-800 border border-cyan-200 rounded-lg font-bold text-xs flex items-center gap-1">
                              <Edit3 className="w-3.5 h-3.5" /> تعديل
                            </button>
                            <button type="button" onClick={() => requestProtectedAction({ kind: 'DELETE_PRODUCT', product: p })} className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-bold text-xs flex items-center gap-1">
                              <Trash2 className="w-3.5 h-3.5" /> حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== 4. الديون والأمانات (Debts) ==================== */}
        {activeTab === 'debts' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border-2 border-amber-300 p-5 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-amber-900">إجمالي ديون العملاء المستحقة</p>
                <h3 className="text-3xl font-black text-amber-700 mt-1">${formatMoney(totalDebts)}</h3>
              </div>
              <CreditCard className="w-12 h-12 text-amber-600" />
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <h3 className="text-base font-bold text-slate-800">سجل الديون والزبائن</h3>
                <input type="text" value={debtSearch} onChange={e => setDebtSearch(e.target.value)} placeholder="بحث باسم الزبون أو الهاتف..." className="bg-gray-50 border rounded-xl px-4 py-2 text-sm min-w-[240px]" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm text-slate-700">
                  <thead className="bg-gray-50 border-b text-gray-600">
                    <tr>
                      <th className="p-3.5">اسم الزبون</th>
                      <th className="p-3.5">الهاتف</th>
                      <th className="p-3.5">المصدر</th>
                      <th className="p-3.5">المبلغ الأصلي</th>
                      <th className="p-3.5">المتبقي</th>
                      <th className="p-3.5 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {debts
                      .filter(d => d.customerName.toLowerCase().includes(debtSearch.toLowerCase()) || d.phone.includes(debtSearch))
                      .map(d => (
                        <tr key={d.id} className="hover:bg-gray-50">
                          <td className="p-3.5 font-bold text-slate-800">{d.customerName}</td>
                          <td className="p-3.5 text-gray-500 font-mono">{d.phone}</td>
                          <td className="p-3.5 text-[#7a1c24] font-semibold">{d.source}</td>
                          <td className="p-3.5">${formatMoney(d.originalAmount)}</td>
                          <td className="p-3.5 font-black text-amber-600">${formatMoney(d.remainingAmount)}</td>
                          <td className="p-3.5">
                            <div className="flex items-center justify-center gap-2">
                              {d.remainingAmount > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDebtToSettle(d);
                                    setSettleAmountStr(String(d.remainingAmount));
                                    setSettleError('');
                                    setIsSettleModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 bg-amber-100 text-amber-900 rounded-lg font-bold text-xs"
                                >
                                  تسديد دفعة
                                </button>
                              ) : (
                                <span className="text-emerald-600 font-bold text-xs px-2">خالص</span>
                              )}
                              <button type="button" onClick={() => requestProtectedAction({ kind: 'DELETE_DEBT', debt: d })} className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-bold text-xs flex items-center gap-1">
                                <Trash2 className="w-3.5 h-3.5" /> حذف
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 5. الصندوق والحسابات (Finance) ==================== */}
        {activeTab === 'finance' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-rose-100">
                <p className="text-sm font-bold text-gray-500">1- المصروفات</p>
                <h3 className="text-2xl font-black text-rose-600 mt-1">${formatMoney(totalExpenses)}</h3>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-emerald-100">
                <p className="text-sm font-bold text-gray-500">2- المقبوضات</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">${formatMoney(totalIncome)}</h3>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-amber-100">
                <p className="text-sm font-bold text-gray-500">3- رصيد الدين</p>
                <h3 className="text-2xl font-black text-amber-600 mt-1">${formatMoney(totalDebts)}</h3>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-[#7a1c24]/20">
                <p className="text-sm font-bold text-gray-500">4- رأس المال (المستودع)</p>
                <h3 className="text-2xl font-black text-[#7a1c24] mt-1">${formatMoney(inventoryCapital)}</h3>
                <p className="text-[11px] text-gray-400 mt-1">قيمة رأس المال المسجل بالمستودع</p>
              </div>

              <div className="bg-[#7a1c24] text-white p-5 rounded-2xl shadow-md">
                <p className="text-sm font-bold text-white/85">5- الأرباح اليومية (6 ص - 6 ص)</p>
                <h3 className="text-2xl font-black text-amber-300 mt-1">${formatMoney(liveTodayStats.netProfit)}</h3>
                <p className="text-[11px] text-white/75 mt-1">تُصفّر 06:00 صباحاً وتُرحّل للأرباح</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h3 className="font-black text-base text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#7a1c24]" /> الأرباح الأسبوعية
                </h3>
                <button
                  type="button"
                  onClick={() => navigateToTab('profits')}
                  className="text-sm font-bold text-[#7a1c24] hover:underline flex items-center gap-1"
                >
                  <Lock className="w-4 h-4" /> فتح تبويب الأرباح (محمي بكلمة سر) ←
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setProfitPeriodFilter('WEEK');
                  navigateToTab('profits');
                }}
                className="w-full sm:w-auto min-w-[280px] p-4 bg-slate-50 hover:bg-[#7a1c24]/5 border-2 border-slate-200 hover:border-[#7a1c24] rounded-2xl text-right space-y-1.5"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-black text-base text-slate-800">أرباح الأسبوع</span>
                  <Calendar className="w-5 h-5 text-[#7a1c24]" />
                </div>
                <div className="text-lg font-black text-slate-500 flex items-center gap-2">
                  <EyeOff className="w-5 h-5 text-[#7a1c24]" />
                  <span>•••••• (مخفية — محمية بكلمة سر)</span>
                </div>
                <div className="text-xs font-bold text-gray-500">
                  من {weekRange.from} إلى {weekRange.to}
                </div>
              </button>
            </div>

            <form onSubmit={addExpenseEntry} className="bg-white p-5 rounded-2xl shadow-sm border space-y-3">
              <h3 className="font-bold text-base text-slate-800">تسجيل مصروف جديد (يُخصم من الأرباح)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input type="text" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} placeholder="بيان المصروف (مثلاً: إيجار، كهرباء، ضيافة...)" className="bg-gray-50 border rounded-xl p-3 text-sm sm:col-span-2" />
                <div className="flex gap-2">
                  <input type="number" step="any" value={expenseAmountStr} onChange={e => setExpenseAmountStr(e.target.value)} placeholder="المبلغ ($)" className="flex-1 bg-gray-50 border rounded-xl p-3 text-sm font-bold" />
                  <button type="submit" className="px-5 py-3 bg-rose-600 text-white font-bold rounded-xl text-sm">خصم مصروف</button>
                </div>
              </div>
            </form>

            <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-3">
              <h3 className="text-base font-bold text-slate-800">سجل حركة الصندوق والحسابات</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm text-slate-700">
                  <thead className="bg-gray-50 border-b text-gray-600">
                    <tr>
                      <th className="p-3.5">التاريخ والوقت</th>
                      <th className="p-3.5">نوع الحركة</th>
                      <th className="p-3.5">البيان</th>
                      <th className="p-3.5">المبلغ</th>
                      <th className="p-3.5 text-center">حذف محمي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ledger
                      .slice()
                      .reverse()
                      .map(l => (
                        <tr key={l.id} className="hover:bg-gray-50">
                          <td className="p-3.5 font-mono text-gray-500 text-xs">{l.date}</td>
                          <td className={`p-3.5 font-bold ${l.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {l.type === 'INCOME' ? 'قبض إيراد' : 'مصروف'}
                          </td>
                          <td className="p-3.5 text-slate-800">{l.description}</td>
                          <td className={`p-3.5 font-black ${l.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {l.type === 'INCOME' ? '+' : '-'}${formatMoney(l.amount)}
                          </td>
                          <td className="p-3.5 text-center">
                            <button type="button" onClick={() => requestProtectedAction({ kind: 'DELETE_LEDGER', entry: l })} className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold">
                              حذف
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 6. تبويب الأرباح (محمي — يظهر الأرباح فقط + تفريغ بكلمة سر) ==================== */}
        {activeTab === 'profits' && isProfitsUnlocked && (
          <div className="space-y-4">
            <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-rose-800">
                <Trash2 className="w-5 h-5 shrink-0" />
                <div>
                  <h4 className="font-black text-sm">تفريغ قيمة الأرباح</h4>
                  <p className="text-xs">لتصفير وتفريغ سجل الأرباح بالكامل (يتطلب إدخال كلمة السر).</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => requestProtectedAction({ kind: 'CLEAR_ALL_PROFITS' })}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow"
              >
                <Lock className="w-4 h-4" /> تفريغ قيمة الأرباح
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-lg text-[#7a1c24] flex items-center gap-2">
                    <FileSpreadsheet className="w-6 h-6" /> جدول الأرباح فقط (نظام إكسل)
                  </h3>
                  <p className="text-xs text-gray-500">يتم ترحيل ربح كل يوم تلقائياً عند الساعة 06:00 صباحاً</p>
                </div>
                <button type="button" onClick={exportProfitsToExcel} className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow">
                  <Download className="w-4 h-4" /> تصدير إلى إكسل
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-2xl border">
                <input type="text" value={profitSearch} onChange={e => setProfitSearch(e.target.value)} placeholder="بحث باسم اليوم أو التاريخ..." className="bg-white border rounded-xl px-3 py-2 text-sm" />
                <select value={profitPeriodFilter} onChange={e => setProfitPeriodFilter(e.target.value as typeof profitPeriodFilter)} className="bg-white border rounded-xl px-3 py-2 text-sm font-bold">
                  <option value="ALL">جميع الأيام</option>
                  <option value="WEEK">أرباح الأسبوع ({weekRange.from} ← {weekRange.to})</option>
                  <option value="CUSTOM">تاريخ مخصص (من - إلى)</option>
                </select>
                <input
                  type="date"
                  value={profitDateFrom}
                  onChange={e => {
                    setProfitDateFrom(e.target.value);
                    setProfitPeriodFilter('CUSTOM');
                  }}
                  className="bg-white border rounded-xl px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={profitDateTo}
                  onChange={e => {
                    setProfitDateTo(e.target.value);
                    setProfitPeriodFilter('CUSTOM');
                  }}
                  className="bg-white border rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <span className="text-xs font-bold text-emerald-800">المجموع التلقائي للأرباح</span>
                  <div className="text-2xl font-black text-emerald-700 mt-1">${formatMoney(profitSummary.totalNet)}</div>
                </div>
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
                  <span className="text-xs font-bold text-indigo-800">المتوسط اليومي للأرباح</span>
                  <div className="text-2xl font-black text-indigo-700 mt-1">${formatMoney(profitSummary.averageNet)}</div>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-xs font-bold text-slate-600">عدد الأيام</span>
                  <div className="text-2xl font-black text-slate-800 mt-1">{profitSummary.count} يوم</div>
                </div>
              </div>

              <div className="overflow-x-auto border-2 border-slate-300 rounded-xl">
                <table className="w-full text-right text-sm border-collapse">
                  <thead className="bg-[#7a1c24] text-white">
                    <tr>
                      <th className="border border-slate-300 p-3">#</th>
                      <th className="border border-slate-300 p-3">اليوم</th>
                      <th className="border border-slate-300 p-3">التاريخ</th>
                      <th className="border border-slate-300 p-3">الفترة</th>
                      <th className="border border-slate-300 p-3">أرباح المبيعات</th>
                      <th className="border border-slate-300 p-3">أرباح الصيانة والبرمجة</th>
                      <th className="border border-slate-300 p-3">صافي الأرباح</th>
                      <th className="border border-slate-300 p-3 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfitRows.map((r, i) => (
                      <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="border border-slate-300 p-3 font-mono text-gray-500">{i + 1}</td>
                        <td className="border border-slate-300 p-3 font-bold">{r.dayName}</td>
                        <td className="border border-slate-300 p-3 font-mono">{r.date}</td>
                        <td className="border border-slate-300 p-3 text-xs text-gray-600">{r.periodLabel}</td>
                        <td className="border border-slate-300 p-3 font-bold text-slate-800">${formatMoney(r.salesProfit)}</td>
                        <td className="border border-slate-300 p-3 font-bold text-slate-800">${formatMoney(r.repairProfit)}</td>
                        <td className={`border border-slate-300 p-3 font-black ${r.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          ${formatMoney(r.netProfit)}
                        </td>
                        <td className="border border-slate-300 p-3 text-center">
                          <button type="button" onClick={() => requestProtectedAction({ kind: 'DELETE_PROFIT_ROW', row: r })} className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold">
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-emerald-50 font-black text-slate-900">
                    <tr>
                      <td colSpan={4} className="border border-slate-300 p-3 text-center">المجموع التلقائي (Σ)</td>
                      <td className="border border-slate-300 p-3">${formatMoney(profitSummary.totalSales)}</td>
                      <td className="border border-slate-300 p-3">${formatMoney(profitSummary.totalRepairs)}</td>
                      <td className="border border-slate-300 p-3 text-emerald-700">${formatMoney(profitSummary.totalNet)}</td>
                      <td className="border border-slate-300 p-3 text-center text-xs">المتوسط: ${formatMoney(profitSummary.averageNet)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 7. الإعدادات (Settings) ==================== */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-4">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#7a1c24]" /> إعدادات المحل والحساب والأرباح
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-gray-600 mb-1 font-bold">اسم المحل (ثابت غير قابل للتعديل)</label>
                  <input type="text" value={FIXED_SHOP_NAME} readOnly className="w-full bg-gray-200 border rounded-xl p-3 font-black text-[#7a1c24] cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1 font-bold flex items-center gap-1">
                    <Phone className="w-4 h-4 text-[#7a1c24]" /> رقم هاتف المحل (يظهر في الفواتير)
                  </label>
                  <input type="text" value={settingsPhone} onChange={e => setSettingsPhone(e.target.value)} className="w-full bg-gray-50 border rounded-xl p-3 font-bold" />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1 font-bold">اسم المستخدم</label>
                  <input type="text" value={settingsUser} onChange={e => setSettingsUser(e.target.value)} className="w-full bg-gray-50 border rounded-xl p-3" />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1 font-bold">كلمة المرور الرئيسية</label>
                  <input type="text" value={settingsPass} onChange={e => setSettingsPass(e.target.value)} className="w-full bg-gray-50 border rounded-xl p-3" />
                </div>
                <div>
                  <label className="block text-indigo-800 mb-1 font-bold flex items-center gap-1">
                    <Lock className="w-4 h-4" /> كلمة مرور أيقونة الأرباح الخاصة
                  </label>
                  <input type="text" value={settingsProfitsPass} onChange={e => setSettingsProfitsPass(e.target.value)} className="w-full bg-indigo-50 border border-indigo-200 rounded-xl p-3 font-bold text-indigo-900" />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1 font-bold">كلمة التذكر (تُستخدم عند نسيان كلمة المرور)</label>
                  <input type="text" value={settingsRemember} onChange={e => setSettingsRemember(e.target.value)} className="w-full bg-gray-50 border rounded-xl p-3 font-bold text-[#7a1c24]" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!settingsUser.trim() || !settingsPass.trim() || !settingsProfitsPass.trim() || !settingsRemember.trim()) {
                      alert('يرجى عدم ترك الحقول الأساسية فارغة!');
                      return;
                    }
                    setAdminCreds({
                      username: settingsUser.trim(),
                      password: settingsPass,
                      profitsPassword: settingsProfitsPass,
                      rememberWord: settingsRemember.trim(),
                      shopPhone: settingsPhone.trim()
                    });
                    alert('تم حفظ الإعدادات بنجاح!');
                  }}
                  className="w-full py-3.5 bg-[#7a1c24] text-white font-bold rounded-xl text-sm shadow"
                >
                  حفظ التعديلات
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-4">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600" /> النسخ الاحتياطي واستعادة البيانات (Offline)
              </h3>
              <p className="text-sm text-gray-500">
                البرنامج محفوظ في ذاكرة الجهاز العميقة (IndexedDB). يُنصح بتحميل نسخة احتياطية دورياً على جهازك.
              </p>
              <div className="space-y-3 pt-2">
                <button type="button" onClick={exportBackup} className="w-full py-3.5 bg-emerald-50 text-emerald-800 border-2 border-emerald-200 font-bold rounded-xl text-sm flex items-center justify-center gap-2">
                  <Download className="w-5 h-5" /> تحميل نسخة احتياطية كاملة (.json)
                </button>
                <div className="relative">
                  <input type="file" accept=".json" onChange={importBackup} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <button type="button" className="w-full py-3.5 bg-gray-50 border-2 text-slate-700 font-bold rounded-xl text-sm flex items-center justify-center gap-2">
                    <Upload className="w-5 h-5" /> استعادة البيانات من ملف
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* شريط التنقل السفلي غير العائم */}
      <nav className="bg-white border-t-2 py-2 px-2 flex justify-around items-center shrink-0 z-30 shadow-inner overflow-x-auto">
        {[
          { id: 'home', label: 'الرئيسية', Icon: LayoutDashboard },
          { id: 'pos', label: 'المبيعات', Icon: ShoppingBag },
          { id: 'maintenance', label: 'الصيانة', Icon: Wrench },
          { id: 'inventory', label: 'المستودع', Icon: Boxes },
          { id: 'debts', label: 'الديون', Icon: CreditCard },
          { id: 'finance', label: 'الصندوق', Icon: Wallet },
          { id: 'profits', label: 'الأرباح', Icon: FileSpreadsheet },
          { id: 'settings', label: 'الإعدادات', Icon: Settings }
        ].map(({ id, label, Icon }) => (
          <button
            type="button"
            key={id}
            onClick={() => navigateToTab(id)}
            className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl shrink-0 ${
              activeTab === id ? 'text-[#7a1c24] bg-[#7a1c24]/10' : 'text-gray-500'
            }`}
          >
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-xs font-bold">{label}</span>
          </button>
        ))}
      </nav>

      {/* ==================== النوافذ المنبثقة (MODALS) ==================== */}

      {/* 0. نافذة كلمة مرور أيقونة الأرباح الخاصة */}
      {showProfitsLockModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div onKeyDown={handleEnterKeyNavigation} className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 text-sm shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-[#7a1c24] text-base flex items-center gap-2">
                <Lock className="w-5 h-5" /> أيقونة الأرباح محمية
              </h3>
              <button type="button" onClick={() => setShowProfitsLockModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600">أدخل <b>كلمة مرور الأرباح الخاصة</b> لفتح وعرض الأرباح:</p>
            <form onSubmit={handleUnlockProfits} className="space-y-3">
              <input
                type="password"
                placeholder="كلمة مرور الأرباح..."
                value={profitsUnlockInput}
                onChange={e => setProfitsUnlockInput(e.target.value)}
                required
                autoFocus
                className="w-full bg-gray-50 border-2 rounded-xl p-3 text-center font-bold text-base"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowProfitsLockModal(false)} className="flex-1 py-2.5 bg-gray-200 rounded-xl font-bold">
                  إلغاء
                </button>
                <button type="submit" className="flex-1 py-2.5 bg-[#7a1c24] text-white rounded-xl font-bold">
                  دخول للأرباح
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. نافذة استلام / تعديل وصل صيانة */}
      {isRepairModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div onKeyDown={handleEnterKeyNavigation} className="bg-white rounded-3xl p-6 w-full max-w-2xl space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b">
              <h3 className="font-black text-base text-[#7a1c24]">
                {editingRepair ? `تعديل معلومات الوصل #${editingRepair.id}` : 'استلام جهاز جديد للصيانة'}
              </h3>
              <button type="button" onClick={() => setIsRepairModalOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={e => saveAndPostRepair(e, false)} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold">اسم الزبون *</label>
                  <input type="text" value={repCustName} onChange={e => setRepCustName(e.target.value)} required className="w-full bg-gray-50 border rounded-xl p-3" />
                </div>
                <div>
                  <label className="block mb-1 font-bold">رقم الهاتف *</label>
                  <input type="text" value={repCustPhone} onChange={e => setRepCustPhone(e.target.value)} required className="w-full bg-gray-50 border rounded-xl p-3" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold">موديل الجهاز *</label>
                  <input type="text" value={repModel} onChange={e => setRepModel(e.target.value)} required className="w-full bg-gray-50 border rounded-xl p-3" />
                </div>
                <div>
                  <label className="block mb-1 font-bold">رقم الـ IMEI</label>
                  <input type="text" value={repImei} onChange={e => setRepImei(e.target.value)} className="w-full bg-gray-50 border rounded-xl p-3" />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-bold">وصف العطل *</label>
                <textarea value={repFault} onChange={e => setRepFault(e.target.value)} rows={2} required className="w-full bg-gray-50 border rounded-xl p-3"></textarea>
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-[#7a1c24]">نوع الخدمة في الورشة:</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'PARTS_AND_REPAIR' as const, label: 'تبديل قطعة + صيانة' },
                    { id: 'REPAIR_NO_PARTS' as const, label: 'صيانة بدون تبديل قطعة' },
                    { id: 'PROGRAMMING' as const, label: 'برمجة (المبلغ كامل ربح)' }
                  ].map(opt => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setRepType(opt.id)}
                      className={`p-3 rounded-xl border-2 font-bold text-xs ${
                        repType === opt.id ? 'bg-[#7a1c24] text-white border-[#7a1c24]' : 'bg-gray-50 text-slate-700 border-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {repType === 'PARTS_AND_REPAIR' && (
                <div className="p-4 bg-gray-50 rounded-2xl border space-y-3">
                  <label className="block font-bold text-[#7a1c24]">إضافة قطعة غيار من المستودع (تُنقص من المخزون تلقائياً):</label>
                  <select
                    value={selectedPartId}
                    onChange={e => {
                      setSelectedPartId(e.target.value);
                      if (e.target.value) {
                        addPartToRepairForm(e.target.value);
                        setSelectedPartId('');
                      }
                    }}
                    className="w-full bg-white border rounded-xl p-2.5"
                  >
                    <option value="">اختر قطعة من المستودع...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} — البيع: ${formatMoney(p.price)} | رأس المال: ${formatMoney(p.cost)} (متوفر: {p.qty})
                      </option>
                    ))}
                  </select>

                  {repParts.length > 0 && (
                    <div className="space-y-2">
                      {repParts.map(pt => (
                        <div key={pt.productId} className="flex items-center justify-between bg-white p-2.5 rounded-xl border text-xs">
                          <div>
                            <span className="font-bold text-slate-800">{pt.name}</span>
                            <span className="text-emerald-700 font-bold mr-2">(ربح القطعة: ${formatMoney((pt.price - pt.cost) * pt.qty)})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>العدد: {pt.qty}</span>
                            <button type="button" onClick={() => setRepParts(prev => prev.filter(x => x.productId !== pt.productId))} className="text-rose-600 font-bold">
                              إزالة
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-[#7a1c24]">
                    {repType === 'PROGRAMMING' ? 'قيمة البرمجة ($) [ربح 100%]' : 'صندوق قيمة الصيانة ($) [ربح 100%]'}
                  </label>
                  <input type="number" step="any" value={repFeeStr} onChange={e => setRepFeeStr(e.target.value)} required className="w-full bg-gray-50 border-2 border-[#7a1c24]/30 rounded-xl p-3 font-black text-base text-[#7a1c24]" />
                </div>
                <div>
                  <label className="block mb-1 font-bold">حالة الدفع</label>
                  <select value={repPayStatus} onChange={e => setRepPayStatus(e.target.value as 'PAID' | 'UNPAID')} className="w-full bg-gray-50 border rounded-xl p-3 font-bold">
                    <option value="UNPAID">آجل / دين</option>
                    <option value="PAID">مدفوع كاش</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-wrap justify-between gap-2 text-sm font-bold">
                <span>إجمالي فاتورة الزبون: <b className="text-[#7a1c24]">${formatMoney(repairCalculations.totalCustomerCost)}</b></span>
                <span>صافي الربح المحسوب: <b className="text-emerald-700">${formatMoney(repairCalculations.totalProfit)}</b></span>
              </div>

              <div className="pt-2 flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => setIsRepairModalOpen(false)} className="px-4 py-3 bg-gray-200 rounded-xl font-bold flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4" /> إلغاء
                </button>
                <button type="submit" className="px-5 py-3 bg-emerald-600 text-white font-bold rounded-xl flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> حفظ الوصل وترحيله
                </button>
                <button type="button" onClick={e => saveAndPostRepair(e, true)} className="px-5 py-3 bg-[#7a1c24] text-white font-bold rounded-xl flex items-center gap-1.5">
                  <Printer className="w-4 h-4" /> حفظ وطباعة الوصل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. نافذة إضافة / تعديل مادة في المستودع */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div onKeyDown={handleEnterKeyNavigation} className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b">
              <h3 className="font-black text-base text-slate-900">
                {editingProduct ? 'تعديل بيانات المادة' : 'إضافة مادة جديدة للمستودع'}
              </h3>
              <button type="button" onClick={() => setIsProductModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveProduct} className="space-y-3 text-sm">
              <div>
                <label className="block mb-1 font-bold">اسم المادة *</label>
                <input type="text" value={prodName} onChange={e => setProdName(e.target.value)} required className="w-full bg-gray-50 border rounded-xl p-3" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold">الباركود</label>
                  <input type="text" value={prodBarcode} onChange={e => setProdBarcode(e.target.value)} placeholder="تلقائي" className="w-full bg-gray-50 border rounded-xl p-3" />
                </div>
                <div>
                  <label className="block mb-1 font-bold">التصنيف</label>
                  <select value={prodCat} onChange={e => setProdCat(e.target.value)} className="w-full bg-gray-50 border rounded-xl p-3">
                    <option value="شاشات">شاشات</option>
                    <option value="بطاريات">بطاريات</option>
                    <option value="شواحن وكوابل">شواحن وكوابل</option>
                    <option value="كفرات ولاصقات">كفرات ولاصقات</option>
                    <option value="قطع صيانة">قطع صيانة</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block mb-1 font-bold">رأس المال ($)</label>
                  <input type="number" step="any" value={prodCostStr} onChange={e => setProdCostStr(e.target.value)} required className="w-full bg-gray-50 border rounded-xl p-3" />
                </div>
                <div>
                  <label className="block mb-1 font-bold">البيع ($)</label>
                  <input type="number" step="any" value={prodPriceStr} onChange={e => setProdPriceStr(e.target.value)} required className="w-full bg-gray-50 border rounded-xl p-3" />
                </div>
                <div>
                  <label className="block mb-1 font-bold">الكمية</label>
                  <input type="number" step="any" value={prodQtyStr} onChange={e => setProdQtyStr(e.target.value)} required className="w-full bg-gray-50 border rounded-xl p-3" />
                </div>
              </div>
              <div>
                <label className="block mb-1 font-bold">حد التنبيه (عند انخفاض الكمية)</label>
                <input type="number" step="any" value={prodMinQtyStr} onChange={e => setProdMinQtyStr(e.target.value)} required className="w-full bg-gray-50 border rounded-xl p-3" />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="px-4 py-2.5 bg-gray-200 rounded-xl font-bold">إلغاء</button>
                <button type="submit" className="px-5 py-2.5 bg-[#7a1c24] text-white font-bold rounded-xl">حفظ المادة</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. نافذة الحماية بكلمة السر (للحذف وتعديل المستودع وتفريغ الأرباح) */}
      {showSecurityModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div onKeyDown={handleEnterKeyNavigation} className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 text-sm shadow-2xl">
            <h3 className="font-black text-[#7a1c24] text-base flex items-center gap-2">
              <Lock className="w-5 h-5" /> تأكيد بكلمة السر
            </h3>
            <p className="text-gray-600">
              {pendingAction?.kind === 'CLEAR_ALL_PROFITS'
                ? 'أدخل كلمة السر لتأكيد تفريغ وتصفير قيمة جميع الأرباح:'
                : 'أدخل كلمة السر لتأكيد تنفيذ هذه العملية الحساسة:'}
            </p>
            <form onSubmit={confirmProtectedAction} className="space-y-3">
              <input
                type="password"
                placeholder="كلمة السر..."
                value={securityPassInput}
                onChange={e => setSecurityPassInput(e.target.value)}
                required
                autoFocus
                className="w-full bg-gray-50 border-2 rounded-xl p-3 text-center font-bold text-base"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSecurityModal(false);
                    setPendingAction(null);
                  }}
                  className="flex-1 py-2.5 bg-gray-200 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button type="submit" className="flex-1 py-2.5 bg-[#7a1c24] text-white rounded-xl font-bold">
                  تأكيد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. نافذة تسديد الدين */}
      {isSettleModalOpen && activeDebtToSettle && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div onKeyDown={handleEnterKeyNavigation} className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 text-sm shadow-2xl">
            <h3 className="font-black text-[#7a1c24] text-base">تسديد دفعة حساب للزبون</h3>
            <div className="p-3.5 bg-gray-50 rounded-2xl border space-y-1">
              <p className="text-gray-600">الزبون: <b className="text-slate-900">{activeDebtToSettle.customerName}</b></p>
              <p className="text-gray-600">الدين المتبقي المستحق: <b className="text-amber-600">${formatMoney(activeDebtToSettle.remainingAmount)}</b></p>
            </div>
            <div>
              <label className="block mb-1 font-bold">المبلغ المدفوع ($)</label>
              <input
                type="number"
                step="any"
                value={settleAmountStr}
                onChange={e => {
                  setSettleAmountStr(e.target.value);
                  setSettleError('');
                }}
                className="w-full bg-gray-50 border-2 rounded-xl p-3 text-lg text-emerald-700 font-black"
              />
            </div>

            {settleError && (
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-700 rounded-xl text-xs font-bold">
                {settleError}
              </div>
            )}

            <div className="flex gap-2">
              <button type="button" onClick={() => confirmDebtSettlement(false)} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold">
                تسديد دفعة
              </button>
              <button type="button" onClick={() => confirmDebtSettlement(true)} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">
                تسديد الكل
              </button>
            </div>
            <button type="button" onClick={() => setIsSettleModalOpen(false)} className="w-full text-gray-500 font-bold pt-1">
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
