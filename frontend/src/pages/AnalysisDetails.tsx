import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { AlertTriangle, CheckCircle, Clock, Search, ArrowLeft } from 'lucide-react';
import { ContradictionCard } from '../components/ContradictionCard';
import { API_BASE_URL, API_KEY } from '../config';
import type { ReportStatus } from '../types';

export function AnalysisDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getAnalysis } = useWorkspace(); 
  const report = getAnalysis(id || '');

  // IMPORTANT: All hooks must be called before any early return to comply
  // with the Rules of Hooks. We guard against missing `report` in the JSX below.
  const [activeTab, setActiveTab] = useState<'queue' | 'critical' | 'resolved'>('queue');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusOverrides, setStatusOverrides] = useState<Record<number, ReportStatus>>({});

  const handleStatusUpdate = useCallback((index: number, newStatus: ReportStatus) => {
    setStatusOverrides(prev => ({ ...prev, [index]: newStatus }));
    if (!report) return;
    fetch(`${API_BASE_URL}/report/${report.audit_id}/contradiction/${index}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({ status: newStatus })
    }).catch(e => console.error("Failed to update status on server", e));
  }, [report]);

  // --- Early return AFTER all hooks ---
  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-xl font-medium text-primary mb-2">Analysis Not Found</h2>
        <p className="text-secondary mb-6">The report you are looking for does not exist or was deleted.</p>
        <button 
          onClick={() => navigate('/analyses')}
          className="px-4 py-2 bg-elevated border border-borderLight rounded-lg text-sm text-primary hover:bg-elevatedHover transition-colors"
        >
          Back to Analyses
        </button>
      </div>
    );
  }

  const contradictions = report.contradictions.map((c, i) => ({
    ...c,
    status: statusOverrides[i] || c.status,
    originalIndex: i
  }));

  const activeConflicts = contradictions.filter(c => c.status === 'Open' || c.status === 'Under Review');
  const criticalConflicts = activeConflicts.filter(c => c.risk_level === 'high');
  const resolvedConflicts = contradictions.filter(c => c.status === 'Resolved' || c.status === 'Ignored');

  const getFilteredContradictions = () => {
    let list = activeConflicts;
    if (activeTab === 'critical') list = criticalConflicts;
    if (activeTab === 'resolved') list = resolvedConflicts;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => 
        c.topic.toLowerCase().includes(q) || 
        c.claim_a.toLowerCase().includes(q) || 
        c.claim_b.toLowerCase().includes(q)
      );
    }
    return list;
  };

  const filteredList = getFilteredContradictions();

  return (
    <div className="max-w-[1400px] mx-auto p-6 space-y-6 pb-32">
      <button 
        onClick={() => navigate('/analyses')}
        className="flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors mb-2"
      >
        <ArrowLeft size={16} /> Back to Analyses
      </button>

      <div className="flex items-center justify-between border-b border-borderLight pb-6">
        <div>
          <h1 className="text-2xl font-heading font-medium text-primary">Security Audit Overview</h1>
          <p className="text-sm text-secondary mt-1">
            Analysis complete for {report.total_documents} documents. Found {report.contradictions_found} contradictions across {report.candidates_checked} candidate pairs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="col-span-1 md:col-span-2 bg-surface p-5 rounded-lg border border-borderLight flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-semibold text-tertiary tracking-wider uppercase mb-1">Knowledge Health</h2>
          </div>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-5xl font-heading font-medium tracking-tight text-primary">{report.health_score.toFixed(0)}</span>
            <span className="text-secondary font-medium">%</span>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-lg border border-borderLight flex flex-col justify-between">
          <h2 className="text-xs font-semibold text-tertiary tracking-wider uppercase mb-1">Active Risks</h2>
          <div className="text-4xl font-heading font-medium tracking-tight text-critical mt-4">
            {activeConflicts.length}
          </div>
        </div>

        <div className="bg-surface p-5 rounded-lg border border-borderLight flex flex-col justify-between">
          <h2 className="text-xs font-semibold text-tertiary tracking-wider uppercase mb-1">Documents</h2>
          <div className="text-4xl font-heading font-medium tracking-tight text-primary mt-4">
            {report.total_documents}
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-lg border border-borderLight overflow-hidden">
        <div className="flex border-b border-borderLight px-2">
          {[
            { id: 'queue' as const, label: 'Active Queue', count: activeConflicts.length, icon: Clock },
            { id: 'critical' as const, label: 'Critical', count: criticalConflicts.length, icon: AlertTriangle },
            { id: 'resolved' as const, label: 'Resolved', count: resolvedConflicts.length, icon: CheckCircle }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 relative ${
                activeTab === tab.id ? 'text-primary' : 'text-secondary hover:text-primary'
              }`}
            >
              <tab.icon size={16} strokeWidth={1.5} className={activeTab === tab.id ? 'text-accent' : ''} />
              {tab.label}
              <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                activeTab === tab.id ? 'bg-elevated text-primary border border-borderLight' : 'bg-transparent text-tertiary'
              }`}>
                {tab.count}
              </span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
              )}
            </button>
          ))}
        </div>

        <div className="p-5 bg-background">
          <div>
            <div className="flex items-center gap-4 mb-5">
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" strokeWidth={2} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search findings..."
                    className="w-full bg-elevated border border-borderLight rounded-md pl-9 pr-3 py-2 text-sm text-primary placeholder:text-tertiary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all"
                  />
                </div>
              </div>

              {filteredList.length === 0 ? (
                <div className="py-20 flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-elevated border border-borderLight rounded-full flex items-center justify-center mb-4">
                    <CheckCircle size={24} className="text-tertiary" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-sm font-medium text-primary mb-1">Queue is empty</h3>
                  <p className="text-sm text-secondary">No findings matching this criteria.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredList.map((c) => (
                    <ContradictionCard
                      key={c.originalIndex}
                      data={c}
                      corpusId={report.corpus_id}
                      onStatusUpdate={(status) => handleStatusUpdate(c.originalIndex, status)}
                    />
                  ))}
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
