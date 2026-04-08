import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProposal, sendProposal, deleteProposal } from "../api";
import { createInvoiceFromProposal } from "../api";
import ProposalPreview from "../components/ProposalPreview";
import ProposalEditor from "../components/ProposalEditor";

function ProposalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("preview"); // preview | edit
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetch() {
      try {
        const res = await getProposal(id);
        setProposal(res.data);
      } catch {
        setError("Proposal not found");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [id]);

  const handleSend = async () => {
    if (!proposal.clientEmail) {
      setError("Add a client email before sending");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await sendProposal(id);
      setProposal(res.data.proposal);
      setMessage("Proposal sent successfully!");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleCreateInvoice = async () => {
    try {
      const res = await createInvoiceFromProposal(id, {});
      navigate(`/invoices`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create invoice");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this proposal?")) return;
    try {
      await deleteProposal(id);
      navigate("/dashboard");
    } catch {
      setError("Failed to delete");
    }
  };

  if (loading) return <div className="empty-state"><span className="loading-spinner"></span> Loading...</div>;
  if (!proposal) return <div className="empty-state"><h3>Proposal not found</h3></div>;

  return (
    <div>
      <div className="proposal-header">
        <div>
          <h1>{proposal.title}</h1>
          <span className={`status-badge status-${proposal.status}`}>{proposal.status}</span>
        </div>
        <div className="proposal-actions">
          <button
            className="btn-secondary btn-sm"
            onClick={() => setMode(mode === "preview" ? "edit" : "preview")}
          >
            {mode === "preview" ? "Edit" : "Preview"}
          </button>

          {proposal.status === "draft" && (
            <button className="btn-primary btn-sm" onClick={handleSend} disabled={sending}>
              {sending ? <><span className="loading-spinner"></span>Sending...</> : "Send to Client"}
            </button>
          )}

          {(proposal.status === "sent" || proposal.status === "accepted") && (
            <button className="btn-success btn-sm" onClick={handleCreateInvoice}>
              Create Invoice
            </button>
          )}

          <button className="btn-danger btn-sm" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      {message && <div className="card" style={{ background: "#14532d", borderColor: "#22c55e" }}>{message}</div>}
      {error && <p className="error-msg">{error}</p>}

      {mode === "preview" ? (
        <ProposalPreview proposal={proposal} />
      ) : (
        <ProposalEditor proposal={proposal} onUpdate={setProposal} />
      )}
    </div>
  );
}

export default ProposalDetail;
