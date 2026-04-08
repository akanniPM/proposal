import React from "react";
import { Link } from "react-router-dom";

function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <Link to="/" className="logo">ProposalAI</Link>

      {user ? (
        <>
          <div className="nav-links">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/proposals/new">New Proposal</Link>
            <Link to="/invoices">Invoices</Link>
          </div>
          <div className="nav-right">
            <span style={{ fontSize: "0.85rem", color: "#71717a" }}>
              {user.name} ({user.plan})
            </span>
            <button className="btn-secondary btn-sm" onClick={onLogout}>Logout</button>
          </div>
        </>
      ) : (
        <div className="nav-right">
          <Link to="/login">Login</Link>
          <Link to="/register"><button className="btn-primary btn-sm">Sign Up</button></Link>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
