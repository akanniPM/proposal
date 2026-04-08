import React from "react";
import { useNavigate } from "react-router-dom";

function ProposalList({ proposals }) {
  const navigate = useNavigate();

  const formatDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (!proposals || proposals.length === 0) {
    return (
      <div className="empty-state">
        <h3>No proposals yet</h3>
        <p>Create your first proposal to get started.</p>
      </div>
    );
  }

  return (
    <div className="proposal-list">
      {proposals.map((p) => (
        <div
          key={p._id}
          className="proposal-item"
          onClick={() => navigate(`/proposals/${p._id}`)}
        >
          <div className="item-info">
            <h3>{p.title}</h3>
            <p>{p.clientName}{p.clientCompany ? ` — ${p.clientCompany}` : ""} · {formatDate(p.createdAt)}</p>
          </div>
          <div className="item-right">
            <span className="item-amount">{p.currency} {p.totalAmount?.toLocaleString()}</span>
            <span className={`status-badge status-${p.status}`}>{p.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ProposalList;
