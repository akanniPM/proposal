import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getProposals, getInvoices } from "../api";
import ProposalList from "../components/ProposalList";

function Dashboard() {
  const [proposals, setProposals] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [pRes, iRes] = await Promise.all([getProposals(1, 20), getInvoices(1, 50)]);
        setProposals(pRes.data.proposals);
        setPagination(pRes.data.pagination);
        setInvoices(iRes.data.invoices);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await getProposals(nextPage, 20);
      setProposals((prev) => [...prev, ...res.data.proposals]);
      setPagination(res.data.pagination);
      setPage(nextPage);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  };

  const totalRevenue = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.total, 0);

  const pendingAmount = invoices
    .filter((i) => i.status === "sent" || i.status === "draft")
    .reduce((sum, i) => sum + i.total, 0);

  if (loading) {
    return <div className="empty-state"><span className="loading-spinner"></span> Loading...</div>;
  }

  const hasMore = pagination && page < pagination.pages;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <Link to="/proposals/new">
          <button className="btn-primary">+ New Proposal</button>
        </Link>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{pagination?.total ?? proposals.length}</div>
          <div className="stat-label">Proposals</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{proposals.filter((p) => p.status === "accepted").length}</div>
          <div className="stat-label">Accepted</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${totalRevenue.toLocaleString()}</div>
          <div className="stat-label">Revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${pendingAmount.toLocaleString()}</div>
          <div className="stat-label">Pending</div>
        </div>
      </div>

      <div className="card">
        <h2>Recent Proposals</h2>
        <ProposalList proposals={proposals} />
        {hasMore && (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button className="btn-secondary" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? <><span className="loading-spinner"></span>Loading...</> : "Load More"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
