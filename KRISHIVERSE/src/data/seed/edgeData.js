// Hand-authored knowledge-graph edges (v1 seed source, preserved verbatim).
// NOTE: these reference nodes (disease_pomegranate_blight, treatment_neem_oil, …)
// that are NOT present in the crops/symptoms/diseasePests/treatments stores, so
// the migration flags them as unresolved/dangling references (never deleted).
export const KNOWLEDGE_GRAPH_EDGES = [
  // Relationship: Symptoms -> Diseases
  { sourceId: 'symptom_yellow_spots', targetId: 'disease_pomegranate_blight', type: 'suggests', weight: 0.8 },
  { sourceId: 'symptom_curling_leaves', targetId: 'disease_pomegranate_blight', type: 'suggests', weight: 0.6 },
  { sourceId: 'symptom_wilting', targetId: 'disease_fusarium_wilt', type: 'suggests', weight: 0.9 },

  // Relationship: Diseases -> Treatments
  { sourceId: 'disease_pomegranate_blight', targetId: 'treatment_neem_oil', type: 'treated_by', weight: 1.0 },
  { sourceId: 'disease_pomegranate_blight', targetId: 'treatment_bordeaux_mixture', type: 'treated_by', weight: 1.0 },
  { sourceId: 'disease_fusarium_wilt', targetId: 'treatment_trichoderma', type: 'treated_by', weight: 1.0 },

  // Relationship: Crop -> Diseases
  { sourceId: 'crop_pomegranate', targetId: 'disease_pomegranate_blight', type: 'susceptible_to', weight: 1.0 },
  { sourceId: 'crop_tomato', targetId: 'disease_fusarium_wilt', type: 'susceptible_to', weight: 1.0 },
];