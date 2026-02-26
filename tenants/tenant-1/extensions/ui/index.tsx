import React from 'react';

/**
 * Extension page for tenant-1.
 * This file is managed by the OpenCodeApp AI agent.
 * Use the assistant widget to request changes.
 */
export default function ExtensionPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>Custom Items Extension</h1>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>
        This page is managed by the AI agent. Use the ✨ assistant to modify it.
      </p>
      <div style={{
        border: '2px dashed #e2e8f0',
        borderRadius: '12px',
        padding: '3rem',
        textAlign: 'center',
        color: '#94a3b8',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✨</div>
        <p>Extension content goes here.</p>
        <p style={{ fontSize: '0.85rem' }}>Ask the AI assistant to customize this page.</p>
      </div>
    </div>
  );
}
