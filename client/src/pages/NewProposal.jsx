import React from "react";
import ProposalForm from "../components/ProposalForm";

function NewProposal() {
  return (
    <div>
      <div className="page-header">
        <h1>Create New Proposal</h1>
      </div>
      <ProposalForm />
    </div>
  );
}

export default NewProposal;
