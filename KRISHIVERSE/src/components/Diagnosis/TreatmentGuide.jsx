import React, { useState } from "react";
import {
  IconCheck,
  IconClock,
  IconDroplet,
  IconSun,
  IconCloud,
  IconAlertTriangle,
  IconInfoCircle,
  IconChevronDown,
  IconChevronUp,
  IconCalendar,
  IconTemperature
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export default function TreatmentGuide({ diagnosis, isOpen, onClose }) {
  const { t } = useTranslation();
  const [expandedSections, setExpandedSections] = useState({
    immediate: true,
    natural: false,
    chemical: false,
    prevention: false,
    monitoring: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!isOpen || !diagnosis) return null;

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'severe': return 'text-error';
      case 'moderate': return 'text-warning';
      case 'mild': return 'text-info';
      default: return 'text-success';
    }
  };

  const getUrgencyLevel = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'severe': return {
        level: 'critical',
        timeframe: '24-48 hours',
        color: 'error',
        icon: IconAlertTriangle
      };
      case 'moderate': return {
        level: 'urgent',
        timeframe: '3-7 days',
        color: 'warning',
        icon: IconClock
      };
      case 'mild': return {
        level: 'routine',
        timeframe: '1-2 weeks',
        color: 'info',
        icon: IconInfoCircle
      };
      default: return {
        level: 'routine',
        timeframe: '1-2 weeks',
        color: 'success',
        icon: IconCheck
      };
    }
  };

  const urgency = getUrgencyLevel(diagnosis.severity);
  const UrgencyIcon = urgency.icon;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-base-100 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-base-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <UrgencyIcon className={`text-${urgency.color}`} size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold">{t("diagnosis.treatmentGuide", "Treatment Guide")}</h2>
                <p className="text-sm text-base-content/60">
                  {diagnosis.name} - {diagnosis.crop}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm btn-circle"
            >
              ×
            </button>
          </div>
          
          {/* Urgency Alert */}
          <div className={`mt-4 p-3 bg-${urgency.color}/10 border border-${urgency.color}/20 rounded-lg`}>
            <div className="flex items-center gap-2">
              <UrgencyIcon className={`text-${urgency.color}`} size={16} />
              <span className={`text-sm font-medium text-${urgency.color}`}>
                {t("diagnosis.urgency", "Urgency")}: {urgency.level.toUpperCase()}
              </span>
              <span className="text-sm text-base-content/60">
                - {t("diagnosis.treatWithin", "Treat within")} {urgency.timeframe}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Immediate Actions */}
          <div className="card bg-base-100 shadow-sm border border-base-200">
            <div 
              className="card-body p-4 cursor-pointer"
              onClick={() => toggleSection('immediate')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-error/10 rounded-full flex items-center justify-center">
                    <IconAlertTriangle className="text-error" size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold">{t("diagnosis.immediateActions", "Immediate Actions")}</h3>
                    <p className="text-sm text-base-content/60">
                      {t("diagnosis.immediateActionsDesc", "Steps to take right now")}
                    </p>
                  </div>
                </div>
                {expandedSections.immediate ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
              </div>
              
              {expandedSections.immediate && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-success/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <IconCheck className="text-success" size={12} />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{t("diagnosis.isolatePlant", "Isolate Affected Plant")}</h4>
                      <p className="text-sm text-base-content/60">
                        {t("diagnosis.isolateDesc", "Remove the affected plant from healthy ones to prevent spread. If in a field, mark the area and avoid cross-contamination.")}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-success/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <IconCheck className="text-success" size={12} />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{t("diagnosis.stopSpreading", "Stop Spreading")}</h4>
                      <p className="text-sm text-base-content/60">
                        {t("diagnosis.stopSpreadingDesc", "Disinfect tools, wash hands, and change clothes if you've touched infected plants. Avoid working with healthy plants after handling infected ones.")}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-success/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <IconCheck className="text-success" size={12} />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{t("diagnosis.removeInfected", "Remove Infected Parts")}</h4>
                      <p className="text-sm text-base-content/60">
                        {t("diagnosis.removeInfectedDesc", "Carefully remove and destroy infected leaves, fruits, or plant parts. Burn or bury them away from the field.")}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Natural Treatment */}
          <div className="card bg-base-100 shadow-sm border border-base-200">
            <div 
              className="card-body p-4 cursor-pointer"
              onClick={() => toggleSection('natural')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">🌿</span>
                  </div>
                  <div>
                    <h3 className="font-bold">{t("diagnosis.naturalTreatment", "Natural Treatment")}</h3>
                    <p className="text-sm text-base-content/60">
                      {t("diagnosis.naturalTreatmentDesc", "Organic and traditional remedies")}
                    </p>
                  </div>
                </div>
                {expandedSections.natural ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
              </div>
              
              {expandedSections.natural && (
                <div className="mt-4 space-y-3">
                  {diagnosis.naturalIndianTreatment && diagnosis.naturalIndianTreatment.length > 0 ? (
                    diagnosis.naturalIndianTreatment.map((treatment, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs">🌿</span>
                        </div>
                        <div>
                          <p className="text-sm text-base-content/80">{treatment}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-base-content/60">
                      {t("diagnosis.noNaturalTreatment", "No specific natural treatments available for this condition.")}
                    </div>
                  )}
                  
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">{t("diagnosis.naturalTips", "Natural Treatment Tips")}:</h4>
                    <ul className="text-sm text-base-content/70 space-y-1">
                      <li>• {t("diagnosis.tip1", "Apply treatments in early morning or late evening")}</li>
                      <li>• {t("diagnosis.tip2", "Test on small area before full application")}</li>
                      <li>• {t("diagnosis.tip3", "Combine multiple methods for better results")}</li>
                      <li>• {t("diagnosis.tip4", "Monitor plant response closely")}</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chemical Treatment */}
          <div className="card bg-base-100 shadow-sm border border-base-200">
            <div 
              className="card-body p-4 cursor-pointer"
              onClick={() => toggleSection('chemical')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">🧪</span>
                  </div>
                  <div>
                    <h3 className="font-bold">{t("diagnosis.chemicalTreatment", "Chemical Treatment")}</h3>
                    <p className="text-sm text-base-content/60">
                      {t("diagnosis.chemicalTreatmentDesc", "Conventional treatment options")}
                    </p>
                  </div>
                </div>
                {expandedSections.chemical ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
              </div>
              
              {expandedSections.chemical && (
                <div className="mt-4 space-y-3">
                  {diagnosis.chemicalTreatment && diagnosis.chemicalTreatment.length > 0 ? (
                    diagnosis.chemicalTreatment.map((treatment, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs">🧪</span>
                        </div>
                        <div>
                          <p className="text-sm text-base-content/80">{treatment}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-base-content/60">
                      {t("diagnosis.noChemicalTreatment", "No specific chemical treatments available for this condition.")}
                    </div>
                  )}
                  
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">{t("diagnosis.safetyPrecautions", "Safety Precautions")}:</h4>
                    <ul className="text-sm text-base-content/70 space-y-1">
                      <li>• {t("diagnosis.safety1", "Wear protective clothing and gloves")}</li>
                      <li>• {t("diagnosis.safety2", "Follow manufacturer instructions exactly")}</li>
                      <li>• {t("diagnosis.safety3", "Apply in well-ventilated areas")}</li>
                      <li>• {t("diagnosis.safety4", "Keep away from children and pets")}</li>
                      <li>• {t("diagnosis.safety5", "Wait recommended days before harvest")}</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Prevention */}
          <div className="card bg-base-100 shadow-sm border border-base-200">
            <div 
              className="card-body p-4 cursor-pointer"
              onClick={() => toggleSection('prevention')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <IconCheck className="text-purple-600" size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold">{t("diagnosis.prevention", "Prevention")}</h3>
                    <p className="text-sm text-base-content/60">
                      {t("diagnosis.preventionDesc", "How to prevent future occurrences")}
                    </p>
                  </div>
                </div>
                {expandedSections.prevention ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
              </div>
              
              {expandedSections.prevention && (
                <div className="mt-4 space-y-3">
                  {diagnosis.prevention && diagnosis.prevention.length > 0 ? (
                    diagnosis.prevention.map((prevention, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <IconCheck className="text-purple-600" size={12} />
                        </div>
                        <div>
                          <p className="text-sm text-base-content/80">{prevention}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-base-content/60">
                      {t("diagnosis.noPrevention", "No specific prevention measures available.")}
                    </div>
                  )}
                  
                  <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">{t("diagnosis.generalPrevention", "General Prevention")}:</h4>
                    <ul className="text-sm text-base-content/70 space-y-1">
                      <li>• {t("diagnosis.cropRotation", "Practice crop rotation")}</li>
                      <li>• {t("diagnosis.sanitation", "Maintain field sanitation")}</li>
                      <li>• {t("diagnosis.healthySeeds", "Use disease-free seeds")}</li>
                      <li>• {t("diagnosis.properSpacing", "Ensure proper plant spacing")}</li>
                      <li>• {t("diagnosis.waterManagement", "Practice proper water management")}</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Monitoring Schedule */}
          <div className="card bg-base-100 shadow-sm border border-base-200">
            <div 
              className="card-body p-4 cursor-pointer"
              onClick={() => toggleSection('monitoring')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <IconCalendar className="text-orange-600" size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold">{t("diagnosis.monitoringSchedule", "Monitoring Schedule")}</h3>
                    <p className="text-sm text-base-content/60">
                      {t("diagnosis.monitoringDesc", "When and how to check progress")}
                    </p>
                  </div>
                </div>
                {expandedSections.monitoring ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
              </div>
              
              {expandedSections.monitoring && (
                <div className="mt-4 space-y-3">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <IconClock size={14} />
                        {t("diagnosis.dailyCheck", "Daily Check")}
                      </h4>
                      <ul className="text-sm text-base-content/70 space-y-1">
                        <li>• {t("diagnosis.daily1", "Inspect for new symptoms")}</li>
                        <li>• {t("diagnosis.daily2", "Check treatment effectiveness")}</li>
                        <li>• {t("diagnosis.daily3", "Monitor plant health")}</li>
                      </ul>
                    </div>
                    
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <IconCalendar size={14} />
                        {t("diagnosis.weeklyCheck", "Weekly Check")}
                      </h4>
                      <ul className="text-sm text-base-content/70 space-y-1">
                        <li>• {t("diagnosis.weekly1", "Document progress with photos")}</li>
                        <li>• {t("diagnosis.weekly2", "Assess overall recovery")}</li>
                        <li>• {t("diagnosis.weekly3", "Adjust treatment if needed")}</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <IconAlertTriangle size={14} />
                      {t("diagnosis.warningSigns", "Warning Signs")}
                    </h4>
                    <ul className="text-sm text-base-content/70 space-y-1">
                      <li>• {t("diagnosis.warning1", "Worsening symptoms after 3 days")}</li>
                      <li>• {t("diagnosis.warning2", "Spread to nearby plants")}</li>
                      <li>• {t("diagnosis.warning3", "New symptoms appearing")}</li>
                      <li>• {t("diagnosis.warning4", "Plant health declining rapidly")}</li>
                    </ul>
                    <p className="text-sm text-base-content/60 mt-2">
                      {t("diagnosis.seekHelp", "If any warning signs appear, consult agricultural expert immediately.")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-base-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-base-content/60">
              <p>{t("diagnosis.lastUpdated", "Last updated")}: {new Date().toLocaleDateString()}</p>
              <p>{t("diagnosis.confidence", "Diagnosis confidence")}: {diagnosis.confidence}</p>
            </div>
            <button
              onClick={onClose}
              className="btn btn-primary"
            >
              {t("diagnosis.understood", "I Understand")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
