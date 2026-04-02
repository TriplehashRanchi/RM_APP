import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

function safeText(value) {
  return String(value ?? "")
    .replace(/[<>&]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeUrl(value) {
  const url = String(value ?? "").trim();
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return url;
  return "";
}

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function amountLabel(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0.00";
  return (
    "Rs " +
    amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function paymentDateLabel(value) {
  if (!value || String(value).toLowerCase() === "pending") return "Pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return safeText(value);
  return date.toLocaleDateString("en-GB");
}

function numberToWords(price) {
  const val = Math.floor(Number(price) || 0);
  return `Indian Rupee ${val.toLocaleString("en-IN")} Only`;
}

function inferApiOrigin(apiBaseUrl) {
  const raw = String(apiBaseUrl || process.env.EXPO_PUBLIC_API_URL || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/api\/?$/, "");
  }
  return "";
}

function getReceiptHtml(payload) {
  const now = new Date();
  const receiptNo = payload.receiptNo || `PAY-${payload.payrollRunId || "001"}`;
  const payDate = paymentDateLabel(payload.paidAt || now);
  const payPeriod =
    payload.month || now.toLocaleString("default", { month: "long", year: "numeric" });
  const apiOrigin = inferApiOrigin(payload.apiBaseUrl);
  const backendLogo = apiOrigin ? `${apiOrigin}/public/logo.png` : "";
  const companyLogoUrl = safeUrl(payload.companyLogo) || backendLogo;
  const website = safeUrl(payload.companyWebsite);
  const netPay = Number(payload.netPay || 0);
  const amountInWords = numberToWords(netPay);
  const paidDays = Number(payload.paidDays || 0);
  const workingDays = Number(payload.workingDays || 30);
  const lopDays = payload.unpaidDays ?? workingDays - paidDays;

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Payslip ${safeText(payPeriod)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: #f2f2f2; color: #333; font-size: 13px; }
    .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 40px 45px; position: relative; }
    .header { display: flex; justify-content: space-between; margin-bottom: 34px; border-bottom: 1px solid #eaeaea; padding-bottom: 16px; }
    .company-info { display: flex; gap: 12px; align-items: center; }
    .logo { height: 45px; width: auto; object-fit: contain; }
    .company-text h1 { font-size: 18px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 0.4px; color: #222; }
    .company-text p { font-size: 12px; color: #666; margin: 2px 0 0 0; }
    .payslip-month { text-align: right; }
    .payslip-month span { display: block; font-size: 11px; color: #666; margin-bottom: 4px; }
    .payslip-month strong { font-size: 16px; color: #000; }
    .summary-container { display: flex; justify-content: space-between; margin-bottom: 34px; gap: 20px; }
    .employee-details { flex: 1; display: grid; grid-template-columns: 120px 1fr; row-gap: 8px; align-content: flex-start; }
    .section-title { grid-column: 1 / -1; font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
    .label { color: #666; font-size: 13px; }
    .value { font-weight: 500; color: #000; font-size: 13px; }
    .net-pay-box { width: 280px; background-color: #f3fcf6; border: 1px solid #dcfce7; border-radius: 6px; padding: 18px; }
    .net-pay-amount-wrap { border-left: 4px solid #22c55e; padding-left: 12px; margin-bottom: 16px; }
    .net-pay-amount { font-size: 24px; font-weight: 600; color: #000; display: block; line-height: 1; margin-bottom: 4px; }
    .net-pay-label { font-size: 11px; color: #666; }
    .pay-days-info { display: flex; justify-content: space-between; border-top: 1px dotted #cbd5e1; padding-top: 10px; }
    .pay-days-label { color: #666; font-size: 12px; }
    .pay-days-val { font-weight: 500; font-size: 12px; margin-left: 8px; }
    .financials { display: flex; gap: 28px; margin-bottom: 10px; }
    .col { flex: 1; }
    .table-header { display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding-bottom: 8px; margin-bottom: 10px; }
    .th { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #444; }
    .line-item { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px; }
    .line-item-amount { font-weight: 500; }
    .total-row { display: flex; justify-content: space-between; border-top: 1px solid #eaeaea; margin-top: 8px; background-color: #fafafa; padding: 10px 5px; border-radius: 4px; }
    .total-label { font-size: 11px; font-weight: 700; color: #444; }
    .total-amount { font-size: 12px; font-weight: 700; color: #000; }
    .net-payable-bar { margin-top: 18px; background-color: #f3fcf6; border: 1px solid #dcfce7; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; border-radius: 4px; }
    .np-left h3 { margin: 0; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #000; }
    .np-left p { margin: 2px 0 0 0; font-size: 11px; color: #666; }
    .np-right { font-size: 18px; font-weight: 700; color: #000; }
    .amount-words { text-align: right; margin-top: 12px; font-size: 12px; color: #444; padding-bottom: 20px; border-bottom: 1px solid #eaeaea; }
    .system-msg { text-align: center; font-size: 10px; color: #888; margin-top: 20px; }
    .brand-footer { text-align: center; font-size: 11px; color: #555; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="company-info">
        <img src="${escapeAttr(companyLogoUrl)}" class="logo" alt="Logo" onerror="this.style.display='none'" />
        <div class="company-text">
          <h1>${safeText(payload.companyName || "TRIPLEHASH")}</h1>
          <p>${safeText(payload.companyAddress || "India")}</p>
        </div>
      </div>
      <div class="payslip-month">
        <span>Payslip For the Month</span>
        <strong>${safeText(payPeriod)}</strong>
      </div>
    </div>

    <div class="summary-container">
      <div class="employee-details">
        <div class="section-title">EMPLOYEE SUMMARY</div>
        <div class="label">Employee Name</div><div class="value">: ${safeText(payload.employeeName || "Employee")}</div>
        <div class="label">Employee ID</div><div class="value">: ${safeText(payload.employeeCode || "--")}</div>
        <div class="label">Pay Period</div><div class="value">: ${safeText(payPeriod)}</div>
        <div class="label">Pay Date</div><div class="value">: ${safeText(payDate)}</div>
        <div class="label">Department</div><div class="value">: ${safeText(payload.department || "-")}</div>
        <div class="label">Receipt No</div><div class="value">: ${safeText(receiptNo)}</div>
      </div>

      <div class="net-pay-box">
        <div class="net-pay-amount-wrap">
          <span class="net-pay-amount">${amountLabel(netPay)}</span>
          <span class="net-pay-label">Total Net Pay</span>
        </div>
        <div class="pay-days-info">
          <div><span class="pay-days-label">Paid Days</span><span class="pay-days-val">: ${safeText(paidDays)}</span></div>
          <div><span class="pay-days-label">LOP Days</span><span class="pay-days-val">: ${safeText(lopDays)}</span></div>
        </div>
      </div>
    </div>

    <div class="financials">
      <div class="col">
        <div class="table-header"><span class="th">EARNINGS</span><span class="th">AMOUNT</span></div>
        <div class="line-item"><span>Basic</span><span class="line-item-amount">${amountLabel(payload.basicSalary)}</span></div>
        <div class="line-item"><span>House Rent Allowance</span><span class="line-item-amount">${amountLabel(payload.hra)}</span></div>
        <div class="line-item"><span>Other Allowances</span><span class="line-item-amount">${amountLabel(payload.otherAllowances)}</span></div>
        <div class="total-row"><span class="total-label">Gross Earnings</span><span class="total-amount">${amountLabel(payload.grossPay)}</span></div>
      </div>
      <div class="col">
        <div class="table-header"><span class="th">DEDUCTIONS</span><span class="th">AMOUNT</span></div>
        <div class="line-item"><span>Provident Fund</span><span class="line-item-amount">${amountLabel(payload.pfContribution)}</span></div>
        <div class="line-item"><span>Professional Tax</span><span class="line-item-amount">${amountLabel(payload.professionalTax)}</span></div>
        <div class="line-item"><span>Income Tax</span><span class="line-item-amount">${amountLabel(payload.tdsEstimate)}</span></div>
        <div class="line-item"><span>ESI</span><span class="line-item-amount">${amountLabel(payload.esiContribution)}</span></div>
        <div class="total-row"><span class="total-label">Total Deductions</span><span class="total-amount">${amountLabel(payload.deductions)}</span></div>
      </div>
    </div>

    <div class="net-payable-bar">
      <div class="np-left">
        <h3>Total Net Payable</h3>
        <p>Gross Earnings - Total Deductions</p>
      </div>
      <div class="np-right">${amountLabel(netPay)}</div>
    </div>

    <div class="amount-words">
      Amount In Words : <b>${safeText(amountInWords)}</b>
    </div>

    <div class="system-msg">-- This is a system-generated document. --</div>
    <div class="brand-footer">
      Powered by <b>RM Club Payroll</b> ${website ? `| ${safeText(website)}` : ""}
    </div>
  </div>
</body>
</html>`;
}

export async function downloadPayrollReceiptPdf(payload) {
  if (!Print?.printToFileAsync || !Sharing?.shareAsync || !FileSystem?.documentDirectory) {
    throw new Error(
      "Receipt module missing. Install expo-print and expo-sharing, then restart the app."
    );
  }

  const html = getReceiptHtml(payload);
  const { uri } = await Print.printToFileAsync({ html });

  const dir = `${FileSystem.documentDirectory}receipts`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }

  const safeMonth = safeText(payload.month || "payslip").replace(/[^\w-]/g, "_");
  const safeRun = safeText(payload.payrollRunId || "run").replace(/[^\w-]/g, "_");
  const fileName = `payslip_${safeMonth}_${safeRun}.pdf`;
  const targetUri = `${dir}/${fileName}`;
  await FileSystem.copyAsync({ from: uri, to: targetUri });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(targetUri, {
      mimeType: "application/pdf",
      dialogTitle: "Payroll Receipt",
      UTI: "com.adobe.pdf",
    });
  }

  return { uri: targetUri, fileName };
}
