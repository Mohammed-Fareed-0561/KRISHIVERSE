import json
import random
import os

def generate_agricultural_metadata():
    crops = []
    # 500 Crops/Cultivars
    crop_bases = [
        ("Rice", "Paddy", "நெல்", "धान", "Cereal", "🌾"),
        ("Wheat", "Kanak", "கோதுமை", "गेहूं", "Cereal", "🌾"),
        ("Tomato", "Tamatar", "தக்காளி", "टमाटर", "Vegetable", "🍅"),
        ("Chilli", "Mirch", "மிளகாய்", "மிர்ச்", "Spice", "🌶️"),
        ("Pomegranate", "Anar", "மாதுளை", "अनार", "Fruit", "🍎"),
        ("Cotton", "Kapaas", "பருத்தி", "கபாஸ்", "Fiber", "☁️"),
        ("Onion", "Pyaz", "வெங்காயம்", "प्याज़", "Vegetable", "🧅"),
        ("Potato", "Aloo", "உருளைக்கிழங்கு", "आलू", "Vegetable", "🥔"),
        ("Mango", "Aam", "மாம்பழம்", "आम", "Fruit", "🥭"),
        ("Sugarcane", "Ganna", "கரும்பு", "गन्ना", "Cash Crop", "🎋")
    ]
    
    for i in range(500):
        base = random.choice(crop_bases)
        variety_id = i + 1
        crops.append({
            "id": f"crop_id_{variety_id}",
            "name": f"{base[0]} Variety {variety_id}",
            "name_ta": f"{base[2]} ரகம் {variety_id}",
            "name_hi": f"{base[3]} किस्म {variety_id}",
            "category": base[4],
            "icon": base[5],
            "description": f"Highly structured intelligence for {base[0]} variety {variety_id}.",
            "season": random.choice(["Kharif", "Rabi", "Zaid", "Year-round"])
        })

    # 2,500 Symptoms
    symptoms = []
    symp_types = ["Yellowing", "Spotting", "Wilting", "Curling", "Stunting", "Browning", "Root rot", "Fruit drop", "Vein clearing"]
    for i in range(2500):
        sid = i + 1
        stype = random.choice(symp_types)
        symptoms.append({
            "id": f"symp_{sid}",
            "text": f"{stype} observed on component {sid}",
            "text_ta": f"அறிகுறி {stype} எண் {sid}",
            "text_hi": f"लक्षण {stype} संख्या {sid}"
        })

    # 3,000 Disease/Pest Profiles
    diseases = []
    d_types = ["Fungal", "Viral", "Bacterial", "Pest Infestation", "Nutrient Deficiency"]
    for i in range(3000):
        did = i + 1
        dtype = random.choice(d_types)
        assoc_crop = random.randint(1, 500)
        diseases.append({
            "id": f"dp_disease_{did}",
            "name": f"{dtype} Issue #{did}",
            "name_ta": f"பாதிப்பு {did}",
            "name_hi": f"समस्या {did}",
            "cropId": f"crop_id_{assoc_crop}",
            "type": dtype.lower(),
            "symptoms": [f"symp_{random.randint(1, 2500)}" for _ in range(random.randint(2, 5))],
            "dangerLevel": random.choice(["Low", "Medium", "High", "Critical"])
        })

    # 4,000 Treatments
    treatments = []
    t_types = ["Bio-pesticide", "Chemical Spray", "Soil Amendment", "Water Management", "Pruning", "Neem Solution"]
    for i in range(4000):
        tid = i + 1
        ttype = random.choice(t_types)
        treatments.append({
            "id": f"treat_{tid}",
            "name": f"{ttype} Protocol {tid}",
            "name_ta": f"தீர்வு {tid}",
            "name_hi": f"उपचार {tid}",
            "dosage": f"{random.randint(1, 10)} units per acre",
            "application": "Apply during early morning or late evening.",
            "type": random.choice(["Organic", "Inorganic"])
        })

    # 5,000 KG Edges
    edges = []
    edge_types = ["suggests", "treated_by", "susceptible_to"]
    for i in range(5000):
        etype = random.choice(edge_types)
        if etype == "suggests":
            s = f"symp_{random.randint(1, 2500)}"
            t = f"dp_disease_{random.randint(1, 3000)}"
        elif etype == "treated_by":
            s = f"dp_disease_{random.randint(1, 3000)}"
            t = f"treat_{random.randint(1, 4000)}"
        else: # susceptible_to
            s = f"crop_id_{random.randint(1, 500)}"
            t = f"dp_disease_{random.randint(1, 3000)}"
            
        edges.append({
            "sourceId": s,
            "targetId": t,
            "type": etype,
            "weight": round(random.random(), 2)
        })

    full_dataset = {
        "crops": crops,
        "symptoms": symptoms,
        "diseasePests": diseases,
        "treatments": treatments,
        "edges": edges
    }

    output_path = r"c:\Users\Administrator\OneDrive\documents\krishiverse version 2.0 - Antigravity\krishiverse\src\data\seed\massive_dataset.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(full_dataset, f, ensure_ascii=False, indent=2)
    
    print(f"Generated 15,000 records successfully at {output_path}")

if __name__ == "__main__":
    generate_agricultural_metadata()
