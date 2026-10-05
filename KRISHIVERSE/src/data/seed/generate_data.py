import json
import random
import uuid

# Configuration
COUNTS = {
    "crops": 500,
    "symptoms": 2500,
    "diseases": 3000,
    "treatments": 4000,
    "edges": 5000
}

OUTPUT_FILE = r"c:\Users\Administrator\OneDrive\documents\krishiverse version 2.0 - Antigravity\krishiverse\src\data\seed\massive_dataset.json"

# Data Pools for Realism
CROP_TYPES = ["Cereal", "Fruit", "Vegetable", "Spice", "Fiber", "Cash Crop", "Pulse", "Oilseed"]
CROP_NAMES = [
    ("Mango", "மாம்பழம்", "आम", "🥭"), ("Rice", "நெல்", "धान", "🌾"), 
    ("Cotton", "பருத்தி", "कपास", "☁️"), ("Potato", "உருளைக்கிழங்கு", "आलू", "🥔"),
    ("Chilli", "மிளகாய்", "मिर्च", "🌶️"), ("Banana", "வாழை", "केला", "🍌"),
    ("Tomato", "தக்காளி", "टमाटर", "🍅"), ("Sugarcane", "கரும்பு", "गन्ना", "🎋"),
    ("Wheat", "கோதுமை", "गेहूं", "🌾"), ("Onion", "வெங்காயம்", "प्याज", "🧅")
]

SYMPTOM_TYPES = ["Leaf", "Stem", "Root", "Fruit", "Overall"]
SYMPTOM_DESCRIPTIONS = [
    "Yellowing of leaves", "Brown spots on margins", "Wilting during day", 
    "Powdery white substance", "Stunted growth", "Curling of young leaves",
    "Sticky residue on stems", "Root rot with foul smell", "Fruit dropping prematurely"
]

DISEASE_TYPES = ["Fungal", "Bacterial", "Viral", "Pest Infestation", "Nutrient Deficiency"]
DISEASE_NAMES = [
    "Blast", "Blight", "Root Rot", "Mildew", "Aphids", "Thrips", 
    "Mealybug", "Wilt", "Leaf Spot", "Mosaic Virus"
]

TREATMENT_TYPES = ["Biological", "Chemical", "Mechanical", "Preventative"]
TREATMENT_NAMES = [
    "Neem Oil Spray", "Trichoderma Viride", "Crop Rotation", 
    "Yellow Sticky Traps", "Balanced NPK Application", "Pruning",
    "Copper Oxychloride", "Pheromone Traps"
]

def generate_crops(count):
    crops = []
    for i in range(count):
        base, ta, hi, icon = random.choice(CROP_NAMES)
        crops.append({
            "id": f"crop_{i}",
            "name": f"{base} Var_{i}",
            "name_ta": f"{ta} ரகம்_{i}",
            "name_hi": f"{hi} किस्म_{i}",
            "category": random.choice(CROP_TYPES),
            "icon": icon,
            "description": f"High-yield climate-resilient variety of {base}.",
            "season": random.choice(["Kharif", "Rabi", "Zaid", "Year-round"])
        })
    return crops

def generate_symptoms(count):
    symptoms = []
    for i in range(count):
        symptoms.append({
            "id": f"symptom_{i}",
            "description": f"{random.choice(SYMPTOM_DESCRIPTIONS)} - Type {i}",
            "location": random.choice(SYMPTOM_TYPES),
            "severity": random.choice(["Low", "Moderate", "High", "Critical"])
        })
    return symptoms

def generate_diseases(count):
    diseases = []
    for i in range(count):
        diseases.append({
            "id": f"disease_{i}",
            "name": f"{random.choice(DISEASE_NAMES)} {i}",
            "type": random.choice(DISEASE_TYPES),
            "threat_level": random.choice(["Safe", "Warning", "Danger", "Extreme"]),
            "scientific_name": f"AgriPathogen v{i}.0"
        })
    return diseases

def generate_treatments(count):
    treatments = []
    for i in range(count):
        treatments.append({
            "id": f"treatment_{i}",
            "name": f"{random.choice(TREATMENT_NAMES)} - Protocol {i}",
            "type": random.choice(TREATMENT_TYPES),
            "cost_effectiveness": random.choice(["$", "$$", "$$$"]),
            "ecological_impact": random.choice(["Green", "Neutral", "Caution"])
        })
    return treatments

def generate_edges(count, crops, symptoms, diseases, treatments):
    edges = []
    crop_ids = [c["id"] for c in crops]
    sym_ids = [s["id"] for s in symptoms]
    dis_ids = [d["id"] for d in diseases]
    treat_ids = [t["id"] for t in treatments]
    
    edge_types = [
        ("affects", crop_ids, dis_ids),
        ("manifests", dis_ids, sym_ids),
        ("cured_by", dis_ids, treat_ids),
        ("prevented_by", crop_ids, treat_ids)
    ]
    
    for i in range(count):
        etype, source_pool, target_pool = random.choice(edge_types)
        edges.append({
            "id": f"edge_{i}",
            "from": random.choice(source_pool),
            "to": random.choice(target_pool),
            "relation": etype,
            "weight": round(random.uniform(0.1, 1.0), 2)
        })
    return edges

def main():
    print("Generating data...")
    crops = generate_crops(COUNTS["crops"])
    symptoms = generate_symptoms(COUNTS["symptoms"])
    diseases = generate_diseases(COUNTS["diseases"])
    treatments = generate_treatments(COUNTS["treatments"])
    edges = generate_edges(COUNTS["edges"], crops, symptoms, diseases, treatments)
    
    dataset = {
        "metadata": {
            "version": "2.0.0",
            "total_records": sum(COUNTS.values()) - COUNTS["edges"],
            "total_edges": COUNTS["edges"],
            "generated_at": str(uuid.uuid4())
        },
        "crops": crops,
        "symptoms": symptoms,
        "diseasePests": diseases,
        "treatments": treatments,
        "edges": edges
    }
    
    print(f"Writing to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2, ensure_ascii=False)
    print("Success!")

if __name__ == "__main__":
    main()
