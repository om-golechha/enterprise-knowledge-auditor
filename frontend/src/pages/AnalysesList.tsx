import { useWorkspace } from '../context/WorkspaceContext';
import { motion } from 'framer-motion';
import { FileText, AlertTriangle, ShieldCheck, ChevronRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AnalysesList() {
  const { analyses } = useWorkspace();
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto p-10 space-y-8 pb-32">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-heading font-medium tracking-tight mb-2 text-primary">Historical Analyses</h1>
          <p className="text-secondary text-sm">Review past document contradiction scans and their resolution status.</p>
        </div>
        <div className="text-sm font-medium text-tertiary">
          {analyses.length} Total Runs
        </div>
      </div>

      {analyses.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center py-20 bg-background rounded-2xl border border-borderLight shadow-card">
          <div className="w-16 h-16 rounded-full bg-elevated border border-borderLight/50 flex items-center justify-center mb-6">
            <Clock size={24} className="text-tertiary" />
          </div>
          <h3 className="text-lg font-medium text-primary mb-2">No historical data</h3>
          <p className="text-sm text-secondary mb-6 text-center max-w-sm">
            You haven't run any contradiction analyses yet. Upload documents in the workspace to get started.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-accent text-white font-medium rounded-lg shadow-glow-accent hover:-translate-y-0.5 hover:bg-accentHover transition-all"
          >
            Go to Workspace
          </button>
        </div>
      ) : (
        <div className="grid gap-4 mt-8">
          {analyses.map((report, idx) => {
            const date = report.timestamp ? new Date(report.timestamp) : new Date();
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            
            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={report.audit_id}
                onClick={() => navigate(`/analyses/${report.audit_id}`)}
                className="group relative bg-background hover:bg-elevated/50 border border-borderLight rounded-xl p-5 flex items-center justify-between cursor-pointer transition-all shadow-card hover:shadow-elevated overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-accent transition-colors" />
                
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-lg bg-elevated border border-borderLight flex items-center justify-center text-secondary group-hover:text-primary transition-colors">
                    <FileText size={20} strokeWidth={1.5} />
                  </div>
                  
                  <div>
                    <h3 className="text-base font-medium text-primary mb-1">
                      {report.name || `Analysis Run — ${dateStr}`}
                    </h3>
                    <div className="flex items-center gap-4 text-xs font-medium text-tertiary">
                      <span className="flex items-center gap-1.5"><Clock size={12} /> {timeStr}</span>
                      <span>•</span>
                      <span>{report.total_documents} Documents</span>
                      <span>•</span>
                      <span>{report.total_claims_extracted} Claims</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-10 pr-4">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-medium text-tertiary mb-1 uppercase tracking-wider">Health</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-heading font-semibold text-primary">{report.health_score.toFixed(0)}</span>
                      <span className="text-xs text-secondary">%</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-medium text-tertiary mb-1 uppercase tracking-wider">Risks</span>
                    <div className="flex items-center gap-2">
                      {report.contradictions_found > 0 ? (
                        <>
                          <AlertTriangle size={14} className="text-critical" strokeWidth={2.5} />
                          <span className="text-lg font-heading font-medium text-critical">{report.contradictions_found}</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={14} className="text-success" strokeWidth={2.5} />
                          <span className="text-lg font-heading font-medium text-success">0</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-elevated border border-borderLight flex items-center justify-center group-hover:border-accent group-hover:text-accent transition-colors">
                    <ChevronRight size={16} strokeWidth={2} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
