import React, { useState } from "react";
import {
  IconHistory,
  IconCalendar,
  IconLeaf,
  IconActivity,
  IconDownload,
  IconTrash,
  IconEye,
  IconSearch,
  IconFilter,
  IconX
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useDiagnose } from "../../hooks/useAdvisory";

export default function DiagnosisHistory({ isOpen, onClose }) {
  const { diagnoses, clearDiagnoses } = useDiagnose();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCrop, setFilterCrop] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [selectedDiagnosis, setSelectedDiagnosis] = useState(null);

  // Filter diagnoses
  const filteredDiagnoses = diagnoses.filter(diagnosis => {
    const matchesSearch = searchTerm === "" || 
      diagnosis.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      diagnosis.cropType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      diagnosis.symptoms?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCrop = filterCrop === "all" || diagnosis.cropType === filterCrop;
    const matchesSeverity = filterSeverity === "all" || diagnosis.severity === filterSeverity;
    
    return matchesSearch && matchesCrop && matchesSeverity;
  });

  // Get unique crops and severities for filters
  const uniqueCrops = [...new Set(diagnoses.map(d => d.cropType).filter(Boolean))];
  const uniqueSeverities = [...new Set(diagnoses.map(d => d.severity).filter(Boolean))];

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'severe': return 'text-error';
      case 'moderate': return 'text-warning';
      case 'mild': return 'text-info';
      default: return 'text-success';
    }
  };

  // Get severity badge
  const getSeverityBadge = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'severe': return 'badge-error';
      case 'moderate': return 'badge-warning';
      case 'mild': return 'badge-info';
      default: return 'badge-success';
    }
  };

  // Format date
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Export history
  const handleExport = () => {
    const exportData = {
      diagnoses: filteredDiagnoses,
      exportDate: new Date().toISOString(),
      totalDiagnoses: diagnoses.length
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `diagnosis-history-${Date.now()}.json`;
    link.click();
  };

  // Clear history
  const handleClearHistory = () => {
    if (window.confirm(t("diagnosis.confirmClearHistory", "Are you sure you want to clear all diagnosis history?"))) {
      clearDiagnoses();
      setSelectedDiagnosis(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-base-100 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-base-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <IconHistory className="text-primary" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold">{t("diagnosis.history", "Diagnosis History")}</h2>
                <p className="text-sm text-base-content/60">
                  {t("diagnosis.historySubtitle", "Track your plant disease analyses")}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <IconX size={20} />
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="p-6 border-b border-base-200 space-y-4">
          {/* Search */}
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/40" size={16} />
            <input
              type="text"
              placeholder={t("diagnosis.searchHistory", "Search diagnosis history...")}
              className="input input-bordered w-full pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <IconFilter size={16} className="text-base-content/40" />
              <span className="text-sm font-medium">{t("diagnosis.filters", "Filters")}:</span>
            </div>
            
            {/* Crop Filter */}
            <select
              className="select select-bordered select-sm"
              value={filterCrop}
              onChange={(e) => setFilterCrop(e.target.value)}
            >
              <option value="all">{t("diagnosis.allCrops", "All Crops")}</option>
              {uniqueCrops.map(crop => (
                <option key={crop} value={crop}>{crop}</option>
              ))}
            </select>

            {/* Severity Filter */}
            <select
              className="select select-bordered select-sm"
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
            >
              <option value="all">{t("diagnosis.allSeverities", "All Severities")}</option>
              {uniqueSeverities.map(severity => (
                <option key={severity} value={severity}>{severity}</option>
              ))}
            </select>

            {/* Actions */}
            <div className="flex gap-2 ml-auto">
              <button
                onClick={handleExport}
                className="btn btn-ghost btn-sm gap-2"
                disabled={filteredDiagnoses.length === 0}
              >
                <IconDownload size={14} />
                {t("diagnosis.export", "Export")}
              </button>
              <button
                onClick={handleClearHistory}
                className="btn btn-ghost btn-sm gap-2 text-error"
                disabled={diagnoses.length === 0}
              >
                <IconTrash size={14} />
                {t("diagnosis.clear", "Clear")}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {filteredDiagnoses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <IconHistory size={48} className="text-base-content/20 mb-4" />
              <h3 className="font-medium text-base-content/60 mb-2">
                {diagnoses.length === 0 
                  ? t("diagnosis.noHistory", "No diagnosis history yet")
                  : t("diagnosis.noMatchingResults", "No matching results")
                }
              </h3>
              <p className="text-sm text-base-content/40">
                {diagnoses.length === 0
                  ? t("diagnosis.startAnalyzing", "Start analyzing plant diseases to build your history")
                  : t("diagnosis.adjustFilters", "Adjust your filters or search terms")
                }
              </p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-4 p-6 h-full overflow-y-auto">
              {/* Diagnosis List */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-base-content/60 mb-3">
                  {t("diagnosis.recentDiagnoses", "Recent Diagnoses")} ({filteredDiagnoses.length})
                </h3>
                {filteredDiagnoses.map((diagnosis) => (
                  <div
                    key={diagnosis.id}
                    className={`card bg-base-50 cursor-pointer transition-all hover:shadow-md ${
                      selectedDiagnosis?.id === diagnosis.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedDiagnosis(diagnosis)}
                  >
                    <div className="card-body p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center">
                            <IconLeaf className="text-success" size={14} />
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">{diagnosis.diagnosis}</h4>
                            <p className="text-xs text-base-content/60">{diagnosis.cropType}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {diagnosis.confidence && (
                            <span className="badge badge-success badge-xs">
                              {diagnosis.confidence}
                            </span>
                          )}
                          {diagnosis.severity && (
                            <span className={`badge ${getSeverityBadge(diagnosis.severity)} badge-xs`}>
                              {diagnosis.severity}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-base-content/40">
                        <div className="flex items-center gap-2">
                          <IconCalendar size={12} />
                          {formatDate(diagnosis.savedAt)}
                        </div>
                        <div className="flex items-center gap-2">
                          <IconActivity size={12} />
                          {diagnosis.analysisMethod || 'unknown'}
                        </div>
                      </div>
                      
                      {diagnosis.symptoms && (
                        <p className="text-xs text-base-content/60 mt-2 line-clamp-2">
                          {diagnosis.symptoms}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected Diagnosis Details */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-base-content/60 mb-3">
                  {t("diagnosis.details", "Details")}
                </h3>
                {selectedDiagnosis ? (
                  <div className="card bg-base-100">
                    <div className="card-body p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
                            <IconLeaf className="text-success" size={18} />
                          </div>
                          <div>
                            <h4 className="font-bold">{selectedDiagnosis.diagnosis}</h4>
                            <p className="text-sm text-base-content/60">{selectedDiagnosis.cropType}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {selectedDiagnosis.confidence && (
                            <span className="badge badge-success">
                              {selectedDiagnosis.confidence}
                            </span>
                          )}
                          {selectedDiagnosis.severity && (
                            <span className={`badge ${getSeverityBadge(selectedDiagnosis.severity)}`}>
                              {selectedDiagnosis.severity}
                            </span>
                          )}
                          {selectedDiagnosis.offline && (
                            <span className="badge badge-ghost">Offline</span>
                          )}
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-base-content/60">{t("diagnosis.date", "Date")}:</span>
                          <span>{formatDate(selectedDiagnosis.savedAt)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-base-content/60">{t("diagnosis.method", "Method")}:</span>
                          <span>{selectedDiagnosis.analysisMethod || 'Unknown'}</span>
                        </div>
                        {selectedDiagnosis.affectedArea && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-base-content/60">{t("diagnosis.affectedArea", "Affected Area")}:</span>
                            <span>{selectedDiagnosis.affectedArea}</span>
                          </div>
                        )}
                      </div>

                      {/* Symptoms */}
                      {selectedDiagnosis.symptoms && (
                        <div className="mb-4">
                          <h5 className="font-medium text-sm mb-2">{t("diagnosis.symptoms", "Symptoms")}:</h5>
                          <p className="text-sm text-base-content/80">{selectedDiagnosis.symptoms}</p>
                        </div>
                      )}

                      {/* Treatments & Prevention */}
                      {Array.isArray(selectedDiagnosis.naturalIndianTreatment) && selectedDiagnosis.naturalIndianTreatment.length > 0 && (
                        <div className="mb-4">
                          <h5 className="font-medium text-sm mb-2">🌿 {t("diagnosis.naturalIndianRemedies", "Natural Remedies")}</h5>
                          <ul className="text-sm text-base-content/80 list-disc list-inside">
                            {selectedDiagnosis.naturalIndianTreatment.map((treatment, idx) => (<li key={idx}>{treatment}</li>))}
                          </ul>
                        </div>
                      )}

                      {Array.isArray(selectedDiagnosis.chemicalTreatment) && selectedDiagnosis.chemicalTreatment.length > 0 && (
                        <div className="mb-4">
                          <h5 className="font-medium text-sm mb-2">🧪 {t("diagnosis.chemicalControl", "Chemical Control")}</h5>
                          <ul className="text-sm text-base-content/80 list-disc list-inside">
                            {selectedDiagnosis.chemicalTreatment.map((treatment, idx) => (<li key={idx}>{treatment}</li>))}
                          </ul>
                        </div>
                      )}

                      {Array.isArray(selectedDiagnosis.prevention) && selectedDiagnosis.prevention.length > 0 && (
                        <div className="mb-4">
                          <h5 className="font-medium text-sm mb-2">{t("diagnosis.prevention", "Prevention")}</h5>
                          <ul className="text-sm text-base-content/80 list-disc list-inside">
                            {selectedDiagnosis.prevention.map((p, idx) => (<li key={idx}>{p}</li>))}
                          </ul>
                        </div>
                      )}

                      {/* Image Preview */}
                      {selectedDiagnosis.imageUrl && (
                        <div className="mb-4">
                          <h5 className="font-medium text-sm mb-2">{t("diagnosis.image", "Image")}:</h5>
                          <img
                            src={selectedDiagnosis.imageUrl}
                            alt="Plant leaf"
                            className="w-full h-48 object-contain bg-base-50 rounded-lg"
                          />
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-4 border-t border-base-200">
                        <button
                          className="btn btn-ghost btn-sm flex-1"
                          onClick={() => {
                            // Implement share functionality
                            navigator.clipboard.writeText(JSON.stringify(selectedDiagnosis, null, 2));
                          }}
                        >
                          <IconDownload size={14} />
                          {t("diagnosis.copy", "Copy")}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm flex-1"
                          onClick={() => {
                            // Implement re-analyze functionality
                            console.log('Re-analyze:', selectedDiagnosis);
                          }}
                        >
                          <IconActivity size={14} />
                          {t("diagnosis.reanalyze", "Re-analyze")}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="card bg-base-50">
                    <div className="card-body text-center py-12">
                      <IconEye size={48} className="text-base-content/20 mx-auto mb-4" />
                      <h3 className="font-medium text-base-content/60 mb-2">
                        {t("diagnosis.selectDiagnosis", "Select a diagnosis")}
                      </h3>
                      <p className="text-sm text-base-content/40">
                        {t("diagnosis.clickToViewDetails", "Click on a diagnosis to view details")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
