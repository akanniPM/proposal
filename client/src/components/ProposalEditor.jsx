import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { refineSection, updateProposal } from "../api";

function ProposalEditor({ proposal, onUpdate }) {
  const [editingSection, setEditingSection] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [refineInput, setRefineInput] = useState("");
  const [refiningId, setRefiningId] = useState(null);
  const [error, setError] = useState("");

  const sortedSections = [...(proposal.sections || [])].sort((a, b) => a.order - b.order);

  const handleEdit = (section) => {
    setEditingSection(section._id);
    setEditContent(section.content);
  };

  const handleSave = async (sectionId) => {
    try {
      const updatedSections = proposal.sections.map((s) =>
        s._id === sectionId ? { ...s, content: editContent } : s
      );
      const res = await updateProposal(proposal._id, { sections: updatedSections });
      onUpdate(res.data);
      setEditingSection(null);
    } catch {
      setError("Failed to save changes");
    }
  };

  const handleRefine = async (sectionId) => {
    if (!refineInput.trim()) return;
    setRefiningId(sectionId);
    setError("");

    try {
      const res = await refineSection(proposal._id, {
        sectionId,
        instruction: refineInput,
      });
      onUpdate(res.data);
      setRefineInput("");
      setRefiningId(null);
    } catch {
      setError("Failed to refine section");
      setRefiningId(null);
    }
  };

  return (
    <div>
      {error && <p className="error-msg">{error}</p>}

      {sortedSections.map((section) => (
        <div key={section._id} className="section-card">
          <h3>
            {section.title}
            <div>
              {editingSection === section._id ? (
                <>
                  <button className="btn-success btn-sm" onClick={() => handleSave(section._id)}>
                    Save
                  </button>
                  <button
                    className="btn-secondary btn-sm"
                    style={{ marginLeft: 6 }}
                    onClick={() => setEditingSection(null)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button className="btn-secondary btn-sm" onClick={() => handleEdit(section)}>
                  Edit
                </button>
              )}
            </div>
          </h3>

          {editingSection === section._id ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={8}
              style={{ marginBottom: 10 }}
            />
          ) : (
            <div className="section-content">
              <ReactMarkdown>{section.content}</ReactMarkdown>
            </div>
          )}

          {/* AI Refine */}
          {editingSection !== section._id && (
            <div className="refine-bar">
              <input
                placeholder="E.g. 'Make it more persuasive' or 'Add payment terms'"
                value={refiningId === section._id ? refineInput : ""}
                onChange={(e) => {
                  setRefiningId(section._id);
                  setRefineInput(e.target.value);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleRefine(section._id)}
              />
              <button
                className="btn-primary btn-sm"
                onClick={() => handleRefine(section._id)}
                disabled={refiningId === section._id && !refineInput.trim()}
              >
                {refiningId === section._id && refineInput === "" ? (
                  <span className="loading-spinner"></span>
                ) : (
                  "Refine with AI"
                )}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default ProposalEditor;
