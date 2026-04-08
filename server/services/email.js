const { Resend } = require("resend");
const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";

// Singleton browser instance — reused across requests to avoid per-call launch overhead
let _browser = null;
let _browserLaunching = null;

async function getBrowser() {
  if (_browser && _browser.connected) return _browser;

  // Prevent concurrent launch races
  if (_browserLaunching) return _browserLaunching;

  _browserLaunching = puppeteer
    .launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] })
    .then((b) => {
      _browser = b;
      _browserLaunching = null;
      b.on("disconnected", () => { _browser = null; });
      return b;
    });

  return _browserLaunching;
}

/**
 * Generate a PDF from an HTML string using Puppeteer.
 */
async function generatePdf(htmlContent) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(htmlContent, {
      waitUntil: "networkidle0",
      baseURL: `file://${path.join(__dirname, "..", "..", "templates")}/`,
    });
    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: { top: "40px", right: "40px", bottom: "40px", left: "40px" },
      printBackground: true,
    });
    return pdfBuffer;
  } finally {
    await page.close();
  }
}

/**
 * Load an HTML template and replace placeholders.
 */
function loadTemplate(templateName, variables) {
  const templatePath = path.join(__dirname, "..", "..", "templates", `${templateName}.html`);
  let html = fs.readFileSync(templatePath, "utf-8");

  for (const [key, value] of Object.entries(variables)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }

  return html;
}

/**
 * Send a proposal PDF to the client via email.
 */
async function sendProposalEmail(proposal, senderName) {
  // Build sections HTML
  const sectionsHtml = proposal.sections
    .sort((a, b) => a.order - b.order)
    .map((s) => `<div class="section"><h2>${s.title}</h2><div>${markdownToHtml(s.content)}</div></div>`)
    .join("");

  // Build milestones HTML
  const milestonesHtml = proposal.milestones
    .map(
      (m) =>
        `<tr><td>${m.title}</td><td>${m.description}</td><td>${m.dueDate}</td><td>${proposal.currency} ${m.amount.toLocaleString()}</td></tr>`
    )
    .join("");

  const html = loadTemplate("proposal", {
    TITLE: proposal.title,
    CLIENT_NAME: proposal.clientName,
    CLIENT_COMPANY: proposal.clientCompany || "",
    SENDER_NAME: senderName,
    SECTIONS: sectionsHtml,
    MILESTONES: milestonesHtml,
    TOTAL: `${proposal.currency} ${proposal.totalAmount.toLocaleString()}`,
    DATE: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    VALID_UNTIL: proposal.validUntil
      ? new Date(proposal.validUntil).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "30 days from date of issue",
  });

  const pdfBuffer = await generatePdf(html);

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [proposal.clientEmail],
    subject: `Proposal: ${proposal.title}`,
    html: `<p>Hi ${proposal.clientName},</p><p>${senderName} has sent you a project proposal. Please find it attached.</p><p>Best regards</p>`,
    attachments: [
      {
        filename: `${proposal.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
        content: pdfBuffer.toString("base64"),
      },
    ],
  });

  if (error) throw new Error(`Email send failed: ${error.message}`);
  return true;
}

/**
 * Send an invoice PDF to the client via email.
 */
async function sendInvoiceEmail(invoice, senderName) {
  const lineItemsHtml = invoice.lineItems
    .map(
      (item) =>
        `<tr><td>${item.description}</td><td>${item.quantity}</td><td>${invoice.currency} ${item.unitPrice.toLocaleString()}</td><td>${invoice.currency} ${item.total.toLocaleString()}</td></tr>`
    )
    .join("");

  const html = loadTemplate("invoice", {
    INVOICE_NUMBER: invoice.invoiceNumber,
    CLIENT_NAME: invoice.clientName,
    CLIENT_COMPANY: invoice.clientCompany || "",
    SENDER_NAME: senderName,
    LINE_ITEMS: lineItemsHtml,
    SUBTOTAL: `${invoice.currency} ${invoice.subtotal.toLocaleString()}`,
    TAX: `${invoice.currency} ${invoice.tax.toLocaleString()}`,
    TOTAL: `${invoice.currency} ${invoice.total.toLocaleString()}`,
    ISSUE_DATE: new Date(invoice.issueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    DUE_DATE: invoice.dueDate
      ? new Date(invoice.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "Upon receipt",
    NOTES: invoice.notes || "",
  });

  const pdfBuffer = await generatePdf(html);

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [invoice.clientEmail],
    subject: `Invoice #${invoice.invoiceNumber}`,
    html: `<p>Hi ${invoice.clientName},</p><p>Please find your invoice #${invoice.invoiceNumber} attached.</p><p>Best regards,<br/>${senderName}</p>`,
    attachments: [
      {
        filename: `Invoice_${invoice.invoiceNumber}.pdf`,
        content: pdfBuffer.toString("base64"),
      },
    ],
  });

  if (error) throw new Error(`Email send failed: ${error.message}`);
  return true;
}

/**
 * Simple markdown to HTML (bold, bullets, line breaks).
 */
function markdownToHtml(md) {
  if (!md) return "";
  return md
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^\- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
    .replace(/\n/g, "<br/>");
}

module.exports = { sendProposalEmail, sendInvoiceEmail, generatePdf, loadTemplate };
