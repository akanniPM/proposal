import React from "react";
import ReactMarkdown from "react-markdown";

function ProposalPreview({ proposal }) {
  if (!proposal) return null;

  const sortedSections = [...(proposal.sections || [])].sort((a, b) => a.order - b.order);

  return (
    <div>
      {/* Client info */}
      <div className="client-bar">
        <div><span>Client:</span><strong>{proposal.clientName}</strong></div>
        {proposal.clientCompany && (
          <div><span>Company:</span><strong>{proposal.clientCompany}</strong></div>
        )}
        {proposal.clientEmail && (
          <div><span>Email:</span><strong>{proposal.clientEmail}</strong></div>
        )}
        <div><span>Total:</span><strong>{proposal.currency} {proposal.totalAmount?.toLocaleString()}</strong></div>
      </div>

      {/* Sections */}
      {sortedSections.map((section) => (
        <div key={section._id} className="section-card">
          <h3>{section.title}</h3>
          <div className="section-content">
            <ReactMarkdown>{section.content}</ReactMarkdown>
          </div>
        </div>
      ))}

      {/* Milestones Table */}
      {proposal.milestones && proposal.milestones.length > 0 && (
        <div className="card">
          <h2>Payment Schedule</h2>
          <table className="milestones-table">
            <thead>
              <tr>
                <th>Milestone</th>
                <th>Description</th>
                <th>Timeline</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {proposal.milestones.map((m, i) => (
                <tr key={i}>
                  <td>{m.title}</td>
                  <td>{m.description}</td>
                  <td>{m.dueDate}</td>
                  <td>{proposal.currency} {m.amount?.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td colSpan={3}>Total</td>
                <td>{proposal.currency} {proposal.totalAmount?.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ProposalPreview;
