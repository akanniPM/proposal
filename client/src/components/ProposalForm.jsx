import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateProposal } from "../api";

function ProposalForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    projectDescription: "",
    clientName: "",
    clientEmail: "",
    clientCompany: "",
    currency: "USD",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await generateProposal(form);
      navigate(`/proposals/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to generate proposal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Describe Your Project</h2>
      <p style={{ color: "#71717a", marginBottom: 20, fontSize: "0.9rem" }}>
        Tell us about the project and your client. AI will generate a full professional proposal.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Client Name *</label>
            <input
              name="clientName"
              value={form.clientName}
              onChange={handleChange}
              placeholder="John Smith"
              required
            />
          </div>
          <div className="form-group">
            <label>Client Company</label>
            <input
              name="clientCompany"
              value={form.clientCompany}
              onChange={handleChange}
              placeholder="Acme Corp"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Client Email</label>
            <input
              type="email"
              name="clientEmail"
              value={form.clientEmail}
              onChange={handleChange}
              placeholder="john@acme.com"
            />
          </div>
          <div className="form-group">
            <label>Currency</label>
            <select name="currency" value={form.currency} onChange={handleChange}>
              <option value="USD">USD ($)</option>
              <option value="NGN">NGN (₦)</option>
              <option value="GBP">GBP (£)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Project Description *</label>
          <textarea
            name="projectDescription"
            value={form.projectDescription}
            onChange={handleChange}
            rows={6}
            placeholder="E.g.: Build a React website for a Lagos restaurant. 3 pages (home, menu, contact), mobile responsive, online reservation form, WhatsApp integration. Client wants it delivered in 2 weeks. Budget is around $1,500."
            required
          />
        </div>

        {error && <p className="error-msg">{error}</p>}

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%" }}>
          {loading ? (
            <><span className="loading-spinner"></span>Generating Proposal...</>
          ) : (
            "Generate Proposal"
          )}
        </button>
      </form>
    </div>
  );
}

export default ProposalForm;
