import {
  AlertCircle,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  TrendingDown,
  TrendingUp
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/context/authContext";
import api from "../../src/utils/api";
import { downloadPayrollReceiptPdf } from "../../src/utils/payrollReceipt";

const { width } = Dimensions.get("window");

// --- UTILITIES ---

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0, 
  }).format(amount);
}

function monthLabel(value) {
  if (!value) return "--";
  const [year, month] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString("en-IN", { month: "long", year: "numeric" });
}

function shortMonth(value) {
    if(!value) return "--";
    const [year, month] = value.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleString("en-IN", { month: "short", year: "2-digit" });
}

// --- COMPONENTS ---

const DetailRow = ({ label, value, type = "neutral", isBold = false }) => {
  let color = "#E2E8F0"; // Default
  if (type === "earning") color = "#34D399";
  if (type === "deduction") color = "#F43F5E";

  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, isBold && styles.detailLabelBold]}>{label}</Text>
      <Text style={[styles.detailValue, { color }, isBold && styles.detailValueBold]}>
        {type === "deduction" ? "-" : ""}{value}
      </Text>
    </View>
  );
};

const StatBadge = ({ label, value, icon: Icon, color }) => (
  <View style={styles.statBadge}>
    <View style={[styles.statIconWrap, { backgroundColor: `${color}20`, borderColor: `${color}40` }]}>
        <Icon size={14} color={color} />
    </View>
    <View>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
    </View>
  </View>
);

export default function EmployeePayrollPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  
  const [history, setHistory] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  const [activeRun, setActiveRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState(null);

  const employeeId = user?.employee_id || user?.employeeId || user?.id;

  // --- DATA LOADING ---

  const loadHistory = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const res = await api.get(`/payroll/employee/${employeeId}`);
      const data = res.data?.data || [];
      // Sort desc by month
      data.sort((a, b) => String(b.month).localeCompare(String(a.month)));
      setHistory(data);
      
      // Auto-select current month or latest
      const current = data.find(d => d.month === month) || data[0];
      if (current) selectPayroll(current);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadHistory();
  }, [user]);

  const selectPayroll = (row) => {
    if (!row) {
        setActiveItem(null);
        setActiveRun(null);
        return;
    }
    setMonth(row.month); // Sync calendar
    setActiveItem(row);
    setActiveRun({
        id: row.payroll_run_id,
        month: row.month,
        status: row.run_status || "DRAFT"
    });
  };

  // --- CALCULATIONS ---

  const {
    netPay, grossPay, totalDeductions, 
    allowancesList, deductionsList, 
    daysPaid, status 
  } = useMemo(() => {
    if (!activeItem) return {};

    // Parse Adjustments
    let adjTotal = 0;
    let adjEntries = [];
    const rawAdj = activeItem.manual_adjustment;
    
    if (typeof rawAdj === 'object' && rawAdj !== null) {
        adjTotal = Number(rawAdj.total_adjustment || 0);
        adjEntries = Array.isArray(rawAdj.entries) ? rawAdj.entries : [];
    } else if (typeof rawAdj === 'number') {
        adjTotal = rawAdj;
    }

    return {
        netPay: activeItem.net_pay,
        grossPay: activeItem.gross_pay,
        totalDeductions: activeItem.deductions,
        daysPaid: activeItem.paid_days || 0,
        status: activeItem.run_status || "PROCESSING",
        allowancesList: [
            { label: "Basic Salary", val: activeItem.basic_salary },
            { label: "HRA", val: activeItem.hra },
            { label: "Other Allowances", val: activeItem.other_allowances },
            ...(adjEntries.filter(e => e.type !== 'DEDUCTION').map(e => ({ label: e.label, val: e.amount })))
        ].filter(i => i.val > 0),
        deductionsList: [
            { label: "PF Contribution", val: activeItem.pf_contribution },
            { label: "ESI Contribution", val: activeItem.esi_contribution },
            { label: "Professional Tax", val: activeItem.professional_tax },
            { label: "TDS / Tax", val: activeItem.tds_estimate },
            ...(adjEntries.filter(e => e.type === 'DEDUCTION').map(e => ({ label: e.label, val: e.amount })))
        ].filter(i => i.val > 0)
    };
  }, [activeItem]);

  // --- HANDLERS ---

  const handleDownload = async () => {
    if (!activeItem || !activeRun) return;
    setDownloading(true);
    try {
        await downloadPayrollReceiptPdf({
            // ... (keep existing params logic from your code)
            companyName: user?.company_name || "Company",
            month: activeRun.month,
            payrollRunId: activeRun.id,
            payrollItemId: activeItem.id,
            employeeName: user?.name,
            employeeCode: user?.emp_id,
            netPay: activeItem.net_pay,
            // ... map other fields
            basicSalary: activeItem.basic_salary,
            hra: activeItem.hra,
            otherAllowances: activeItem.other_allowances,
            deductions: activeItem.deductions,
            grossPay: activeItem.gross_pay,
            // Simple mapping for demo
            status: activeItem.run_status
        });
        setToast({ msg: "Receipt Saved!", type: "success" });
    } catch (e) {
        setToast({ msg: "Download failed.", type: "error" });
    } finally {
        setDownloading(false);
        setTimeout(() => setToast(null), 3000);
    }
  };

  const cycleMonth = (dir) => {
    // Logic to switch between available history items
    const idx = history.findIndex(h => h.month === month);
    if (idx === -1) return;
    
    const newIdx = idx + dir; // -1 for newer (because sorted desc), +1 for older
    if (newIdx >= 0 && newIdx < history.length) {
        selectPayroll(history[newIdx]);
    }
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1221" />
      
      {/* Background Ambience */}
      <View style={styles.bgGlowTop} />
      
      {/* --- HEADER --- */}
      <View style={styles.header}>
        <View>
             <Text style={styles.headerLabel}>PAYROLL DASHBOARD</Text>
             <Text style={styles.headerTitle}>My Compensation</Text>
        </View>
        <View style={styles.monthSelector}>
             <Pressable onPress={() => cycleMonth(-1)} style={styles.iconBtn}>
                 <ChevronLeft size={16} color="#94A3B8" />
             </Pressable>
             <View style={styles.dateDisplay}>
                 <Calendar size={12} color="#38BDF8" style={{marginRight:6}} />
                 <Text style={styles.dateText}>{monthLabel(month)}</Text>
             </View>
             <Pressable onPress={() => cycleMonth(1)} style={styles.iconBtn}>
                 <ChevronRight size={16} color="#94A3B8" />
             </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* --- MAIN CARD --- */}
        {activeItem ? (
            <View style={styles.payCard}>
                <View style={styles.payCardInner}>
                    <View style={styles.payCardTop}>
                        <View style={styles.statusPill}>
                            {status === "PAID" ? <CheckCircle2 size={12} color="#10B981" /> : <AlertCircle size={12} color="#FBBF24" />}
                            <Text style={[styles.statusText, { color: status === "PAID" ? "#10B981" : "#FBBF24" }]}>
                                {status || "PROCESSING"}
                            </Text>
                        </View>
                        <Text style={styles.runId}>Ref: #{activeRun?.id}</Text>
                    </View>

                    <View style={styles.payCardBody}>
                        <Text style={styles.netLabel}>Net Take Home</Text>
                        <Text style={styles.netAmount}>{formatCurrency(netPay)}</Text>
                    </View>

                    <View style={styles.payCardFooter}>
                        <Pressable 
                            style={styles.downloadBtn}
                            onPress={handleDownload}
                            disabled={downloading}
                        >
                            {downloading ? (
                                <ActivityIndicator size="small" color="#0F172A" />
                            ) : (
                                <>
                                <Download size={16} color="#0F172A" />
                                <Text style={styles.downloadText}>Download Payslip</Text>
                                </>
                            )}
                        </Pressable>
                    </View>
                </View>

                {/* Card Glow */}
                <View style={styles.cardGlow} />
            </View>
        ) : (
            <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No payroll data for {monthLabel(month)}</Text>
            </View>
        )}

        {activeItem && (
        <>
            {/* --- TIMELINE STRIP --- */}
            <View style={styles.timelineContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 16}}>
                    {history.map((h) => {
                        const isActive = h.month === month;
                        return (
                            <Pressable 
                                key={h.id} 
                                onPress={() => selectPayroll(h)}
                                style={[styles.timelineChip, isActive && styles.timelineChipActive]}
                            >
                                <Text style={[styles.timelineText, isActive && styles.timelineTextActive]}>
                                    {shortMonth(h.month)}
                                </Text>
                            </Pressable>
                        )
                    })}
                </ScrollView>
            </View>

            {/* --- SUMMARY STATS --- */}
            <View style={styles.statsRow}>
                <StatBadge 
                    label="Gross Earnings" 
                    value={formatCurrency(grossPay)} 
                    icon={TrendingUp} 
                    color="#34D399" 
                />
                <StatBadge 
                    label="Total Deductions" 
                    value={formatCurrency(totalDeductions)} 
                    icon={TrendingDown} 
                    color="#F43F5E" 
                />
            </View>

            {/* --- DIGITAL RECEIPT --- */}
            <View style={styles.receiptCard}>
                <View style={styles.receiptHeader}>
                    <Briefcase size={16} color="#94A3B8" />
                    <Text style={styles.receiptTitle}>SALARY BREAKDOWN</Text>
                </View>

                {/* Earnings Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>EARNINGS</Text>
                    {allowancesList.map((item, i) => (
                        <DetailRow key={i} label={item.label} value={formatCurrency(item.val)} type="earning" />
                    ))}
                    <View style={styles.divider} />
                    <DetailRow label="Gross Pay" value={formatCurrency(grossPay)} isBold />
                </View>

                {/* Deductions Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: "#FDA4AF" }]}>DEDUCTIONS</Text>
                    {deductionsList.map((item, i) => (
                        <DetailRow key={i} label={item.label} value={formatCurrency(item.val)} type="deduction" />
                    ))}
                    <View style={styles.divider} />
                    <DetailRow label="Total Deductions" value={formatCurrency(totalDeductions)} type="deduction" isBold />
                </View>

                {/* Final Total */}
                <View style={styles.receiptFooter}>
                    <View style={styles.dashedLine} />
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>NET PAYABLE</Text>
                        <Text style={styles.totalValue}>{formatCurrency(netPay)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoText}>Paid Days: {daysPaid}</Text>
                        <Text style={styles.infoText}>•</Text>
                        <Text style={styles.infoText}>Mode: Bank Transfer</Text>
                    </View>
                </View>

                {/* Sawtooth edge effect (Visual only) */}
                <View style={styles.sawtoothContainer}>
                     {[...Array(20)].map((_, i) => (
                         <View key={i} style={styles.sawtooth} />
                     ))}
                </View>
            </View>
        </>
        )}

      </ScrollView>

      {/* --- TOAST --- */}
      {toast && (
          <View style={[styles.toast, toast.type === 'error' ? styles.toastError : styles.toastSuccess]}>
              <Text style={styles.toastText}>{toast.msg}</Text>
          </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B1221" },
  bgGlowTop: {
    position: "absolute",
    top: -120, right: -50,
    width: width, height: 400,
    backgroundColor: "rgba(56, 189, 248, 0.08)",
    borderRadius: 999,
  },
  scrollContent: { paddingBottom: 100 },
  
  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerLabel: { color: "#64748B", fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  headerTitle: { color: "#F8FAFC", fontSize: 20, fontWeight: "800", marginTop: 4 },
  monthSelector: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconBtn: { padding: 6, backgroundColor: "rgba(30,41,59,0.5)", borderRadius: 8 },
  dateDisplay: { 
    flexDirection: "row", alignItems: "center", 
    backgroundColor: "rgba(15,23,42,0.6)", 
    paddingHorizontal: 12, paddingVertical: 6, 
    borderRadius: 8, borderWidth: 1, borderColor: "rgba(56,189,248,0.2)"
  },
  dateText: { color: "#E0F2FE", fontSize: 13, fontWeight: "700" },

  // Pay Card (The Hero)
  payCard: {
    marginHorizontal: 16,
    height: 200,
    borderRadius: 24,
    marginBottom: 20,
  },
  payCardInner: {
    flex: 1,
    backgroundColor: "#172033",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    justifyContent: "space-between",
    zIndex: 2,
    overflow: "hidden",
  },
  cardGlow: {
    position: "absolute",
    bottom: -40, right: -40,
    width: 200, height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    zIndex: 1,
  },
  payCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusPill: { flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: "rgba(0,0,0,0.3)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  statusText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  runId: { color: "#64748B", fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  payCardBody: { alignItems: "center" },
  netLabel: { color: "#94A3B8", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 },
  netAmount: { color: "#F8FAFC", fontSize: 36, fontWeight: "900", letterSpacing: -1 },
  payCardFooter: { marginTop: 10 },
  downloadBtn: {
    backgroundColor: "#38BDF8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  downloadText: { color: "#0F172A", fontWeight: "700", fontSize: 13 },
  emptyCard: { margin: 20, alignItems: "center", padding: 30, backgroundColor: "#1E293B", borderRadius: 16 },
  emptyText: { color: "#64748B" },

  // Timeline
  timelineContainer: { marginBottom: 20 },
  timelineChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: "#1E293B", borderRadius: 100,
    marginRight: 8,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.05)"
  },
  timelineChipActive: { backgroundColor: "rgba(56,189,248,0.15)", borderColor: "#38BDF8" },
  timelineText: { color: "#64748B", fontSize: 12, fontWeight: "600" },
  timelineTextActive: { color: "#38BDF8" },

  // Stats Row
  statsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 12, marginBottom: 20 },
  statBadge: { 
    flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#162032", padding: 12, borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.05)"
  },
  statIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  statLabel: { color: "#64748B", fontSize: 10, fontWeight: "600" },
  statValue: { color: "#F8FAFC", fontSize: 14, fontWeight: "700", marginTop: 2 },

  // Receipt Card
  receiptCard: {
    marginHorizontal: 16,
    backgroundColor: "#1E293B",
    borderRadius: 20,
    overflow: "hidden", // for sawtooth
  },
  receiptHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#253045", padding: 16,
  },
  receiptTitle: { color: "#CBD5E1", fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  section: { padding: 20, paddingBottom: 10 },
  sectionHeader: { color: "#34D399", fontSize: 11, fontWeight: "700", marginBottom: 12, letterSpacing: 1 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  detailLabel: { color: "#94A3B8", fontSize: 13 },
  detailLabelBold: { color: "#E2E8F0", fontWeight: "700" },
  detailValue: { color: "#F1F5F9", fontSize: 13, fontWeight: "600" },
  detailValueBold: { fontSize: 14, fontWeight: "800" },
  divider: { height: 1, backgroundColor: "#334155", marginVertical: 8 },
  
  // Receipt Footer
  receiptFooter: { backgroundColor: "#111827", padding: 20, paddingBottom: 30 },
  dashedLine: { 
    height: 1, borderWidth: 1, borderColor: "#334155", borderStyle: "dashed", 
    borderRadius: 1, marginBottom: 20, opacity: 0.5 
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  totalLabel: { color: "#94A3B8", fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  totalValue: { color: "#F8FAFC", fontSize: 22, fontWeight: "900" },
  infoRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  infoText: { color: "#475569", fontSize: 11 },

  // Visual Flourishes
  sawtoothContainer: { flexDirection: "row", height: 6, overflow: "hidden", backgroundColor: "#0B1221" },
  sawtooth: {
      width: (width - 32) / 20, height: 10,
      backgroundColor: "#1E293B",
      borderRadius: 10, // approximate jagged look
      marginTop: -6
  },

  // Toast
  toast: { position: "absolute", bottom: 40, alignSelf: "center", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 100, borderWidth: 1 },
  toastSuccess: { backgroundColor: "rgba(6, 78, 59, 0.9)", borderColor: "#059669" },
  toastError: { backgroundColor: "rgba(136, 19, 55, 0.9)", borderColor: "#E11D48" },
  toastText: { color: "#FFF", fontSize: 13, fontWeight: "600" },
});
