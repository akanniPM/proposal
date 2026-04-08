import React, { useState, useEffect } from "react";
import { getInvoices, sendInvoice, updateInvoice } from "../api";
import InvoiceView from "../components/InvoiceView";

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [message, setMessage] = useState("");

  const refreshInvoices = async (resetPage = false) => {
    const res = await getInvoices(1, 20);
    setInvoices(res.data.invoices);
    setPagination(res.data.pagination);
    if (resetPage) setPage(1);
  };

  useEffect(() => {
    async function fetch() {
      try {
        const res = await getInvoices(1, 20);
        setInvoices(res.data.invoices);
        setPagination(res.data.pagination);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await getInvoices(nextPage, 20);
      setInvoices((prev) => [...prev, ...res.data.invoices]);
      setPagination(res.data.pagination);
      setPage(nextPage);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSend = async (invoice) => {
    try {
      await sendInvoice(invoice._id);
      setMessage(`Invoice #${invoice.invoiceNumber} sent!`);
      await refreshInvoices(true);
    } catch {
      setMessage("Failed to send invoice");
    }
  };

  const handleMarkPaid = async (invoice) => {
    try {
      await updateInvoice(invoice._id, { status: "paid" });
      await refreshInvoices(true);
      setSelected(null);
      setMessage(`Invoice #${invoice.invoiceNumber} marked as paid!`);
    } catch {
      setMessage("Failed to update");
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (loading) return <div className="empty-state"><span className="loading-spinner"></span> Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Invoices</h1>
      </div>

      {message && (
        <div className="card" style={{ background: "#14532d", borderColor: "#22c55e", marginBottom: 16 }}>
          {message}
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="empty-state">
          <h3>No invoices yet</h3>
          <p>Create an invoice from an accepted proposal.</p>
        </div>
      ) : (
        <div className="proposal-list">
          {invoices.map((inv) => (
            <div
              key={inv._id}
              className="proposal-item"
              onClick={() => setSelected(selected?._id === inv._id ? null : inv)}
            >
              <div className="item-info">
                <h3>#{inv.invoiceNumber}</h3>
                <p>{inv.clientName} · {formatDate(inv.issueDate)}</p>
              </div>
              <div className="item-right">
                <span className="item-amount">{inv.currency} {inv.total?.toLocaleString()}</span>
                <span className={`status-badge status-${inv.status}`}>{inv.status}</span>
                {inv.status === "draft" && (
                  <button className="btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); handleSend(inv); }}>
                    Send
                  </button>
                )}
                {(inv.status === "sent" || inv.status === "draft") && (
                  <button className="btn-success btn-sm" onClick={(e) => { e.stopPropagation(); handleMarkPaid(inv); }}>
                    Mark Paid
                  </button>
                )}
              </div>
            </div>
          ))}
          {pagination && page < pagination.pages && (
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button className="btn-secondary" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? <><span className="loading-spinner"></span>Loading...</> : "Load More"}
              </button>
            </div>
          )}
        </div>
      )}

      {selected && <InvoiceView invoice={selected} />}
    </div>
  );
}

export default Invoices;
