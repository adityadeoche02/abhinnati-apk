'use client';

import React, { useState } from 'react';
import styles from './admin.module.css';
import { ShieldCheck, Clock, Users, CheckCircle, LayoutDashboard, Settings, FileText, XCircle } from 'lucide-react';

export default function AdminDashboardClient({ initialVendors, stats: initialStats }: any) {
  const [vendors, setVendors] = useState(initialVendors);
  const [stats, setStats] = useState(initialStats);
  const [processing, setProcessing] = useState<string | null>(null);

  const handleApprove = async (vendorId: string) => {
    setProcessing(vendorId);
    try {
      const res = await fetch(`/api/v1/admin/approve-vendor/${vendorId}`, {
        method: 'POST',
      });
      
      if (res.ok) {
        // Remove from list and update stats
        setVendors(vendors.filter((v: any) => v.id !== vendorId));
        setStats({
          ...stats,
          pending: stats.pending - 1,
          approved: stats.approved + 1
        });
      } else {
        alert('Failed to approve vendor');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className={styles.container}>
      {/* Sidebar Navigation */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <ShieldCheck size={32} color="#1D4ED8" strokeWidth={2.5} />
          Abhinnati Admin
        </div>
        <nav>
          <div className={`${styles.navItem} ${styles.active}`}>
            <CheckCircle size={20} />
            KYC Approvals
          </div>
          <div className={styles.navItem}>
            <Users size={20} />
            User Management
          </div>
          <div className={styles.navItem}>
            <FileText size={20} />
            Content Moderation
          </div>
          <div className={styles.navItem}>
            <LayoutDashboard size={20} />
            System Analytics
          </div>
          <div className={styles.navItem}>
            <Settings size={20} />
            Settings
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        <header className={styles.header}>
          <h1 className={styles.title}>Vendor KYC Approvals</h1>
          <p className={styles.subtitle}>Review and verify pending business registrations from the mobile app.</p>
        </header>

        {/* Statistics Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Pending Reviews</div>
            <div className={styles.statValue} style={{ color: '#D97706' }}>{stats.pending}</div>
            <Clock size={24} color="#D97706" style={{ position: 'absolute', right: 24, top: 24, opacity: 0.2 }} />
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Approved Vendors</div>
            <div className={styles.statValue} style={{ color: '#059669' }}>{stats.approved}</div>
            <CheckCircle size={24} color="#059669" style={{ position: 'absolute', right: 24, top: 24, opacity: 0.2 }} />
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Registrations</div>
            <div className={styles.statValue}>{stats.total}</div>
            <Users size={24} color="#3B82F6" style={{ position: 'absolute', right: 24, top: 24, opacity: 0.2 }} />
          </div>
        </div>

        {/* Data Table */}
        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <h2 className={styles.tableTitle}>Pending Queue</h2>
          </div>

          {vendors.length === 0 ? (
            <div className={styles.emptyState}>
              <CheckCircle size={48} className={styles.emptyIcon} />
              <h3>All Caught Up!</h3>
              <p>There are no pending vendor registrations to review right now.</p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Business & Vendor</th>
                  <th>Category</th>
                  <th>Contact Info</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor: any) => (
                  <tr key={vendor.id}>
                    <td>
                      <div className={styles.vendorInfo}>
                        <div className={styles.avatar}>
                          {vendor.business?.nameEn?.charAt(0) || vendor.user?.name?.charAt(0) || 'B'}
                        </div>
                        <div>
                          <div className={styles.vendorName}>{vendor.business?.nameEn || 'Unknown Business'}</div>
                          <div className={styles.vendorBusiness}>{vendor.user?.name || 'Registered Vendor'}</div>
                        </div>
                      </div>
                    </td>
                    <td>{vendor.business?.categoryNameEn || 'Uncategorized'}</td>
                    <td>{vendor.user?.phone || 'N/A'}</td>
                    <td>
                      <span className={`${styles.badge} ${styles.pending}`}>
                        <Clock size={14} /> Pending
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionCell}>
                        <button 
                          className={styles.btnApprove} 
                          onClick={() => handleApprove(vendor.id)}
                          disabled={processing === vendor.id}
                        >
                          {processing === vendor.id ? 'Approving...' : 'Approve'}
                        </button>
                        <button className={styles.btnReject}>
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
