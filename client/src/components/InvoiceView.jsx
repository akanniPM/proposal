import React from "react";

function InvoiceView({ invoice }) {
  if (!invoice) return null;

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Invoice #{invoice.invoiceNumber}</h2>
          <p style={{ color: "#71717a", fontSize: "0.85rem" }}>
            Issued: {formatDate(invoice.issueDate)} · Due: {formatDate(invoice.dueDate)}
          </p>
        </div>
        <span className={`status-badge status-${invoice.status}`}>{invoice.status}</span>
      </div>

      <div className="client-bar">
        <div><span>Client:</span><strong>{invoice.clientName}</strong></div>
        {invoice.clientCompany && <div><span>Company:</span><strong>{invoice.clientCompany}</strong></div>}
      </div>

      <table className="milestones-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems?.map((item, i) => (
            <tr key={i}>
              <td>{item.description}</td>
              <td>{item.quantity}</td>
              <td>{invoice.currency} {item.unitPrice?.toLocaleString()}</td>
              <td>{invoice.currency} {item.total?.toLocaleString()}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} style={{ textAlign: "right", color: "#71717a" }}>Subtotal</td>
            <td>{invoice.currency} {invoice.subtotal?.toLocaleString()}</td>
          </tr>
          {invoice.tax > 0 && (
            <tr>
              <td colSpan={3} style={{ textAlign: "right", color: "#71717a" }}>Tax ({invoice.taxRate}%)</td>
              <td>{invoice.currency} {invoice.tax?.toLocaleString()}</td>
            </tr>
          )}
          <tr className="total-row">
            <td colSpan={3} style={{ textAlign: "right" }}>Total</td>
            <td>{invoice.currency} {invoice.total?.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      {invoice.notes && (
        <div style={{ marginTop: 16, fontSize: "0.9rem", color: "#a1a1aa" }}>
          <strong>Notes:</strong> {invoice.notes}
        </div>
      )}
    </div>
  );
}

export default InvoiceView;
