import spacy
import re
from typing import Dict, List

# Load spaCy model (run: python -m spacy download en_core_web_sm)
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    raise OSError(
        "spaCy model not found. Run: python -m spacy download en_core_web_sm"
    )

CRIME_KEYWORDS = {
    "Homicide":       ["homicide", "murder", "killed", "shooting", "shot dead"],
    "Assault":        ["assault", "attacked", "punched", "beaten", "stabbed"],
    "Robbery":        ["robbery", "robbed", "mugged", "held at gunpoint"],
    "Burglary":       ["burglary", "broke in", "forced entry", "burglar"],
    "Theft":          ["theft", "stolen", "shoplifting", "pickpocket", "stole"],
    "Vehicle Theft":  ["vehicle theft", "car stolen", "carjacking", "auto theft"],
    "Drug Offense":   ["drug", "narcotics", "possession", "trafficking", "cocaine",
                       "heroin", "marijuana"],
    "Vandalism":      ["vandalism", "graffiti", "defaced", "damaged property"],
    "Fraud":          ["fraud", "scam", "forgery", "identity theft", "embezzlement"],
    "Weapons":        ["weapon", "gun", "firearm", "knife", "armed"],
}

SEVERITY_MAP = {
    "Homicide": "High", "Assault": "High", "Robbery": "High",
    "Burglary": "Medium", "Theft": "Medium", "Vehicle Theft": "Medium",
    "Weapons": "Medium", "Drug Offense": "Low",
    "Vandalism": "Low", "Fraud": "Low",
}


def extract_crime_info(text: str) -> Dict:
    """
    Extract structured crime information from raw police report text.

    Args:
        text: Raw police report or incident description

    Returns:
        Dictionary with detected crime type, entities, severity, and keywords
    """
    doc = nlp(text)
    text_lower = text.lower()

    # --- Detect crime type ---
    detected_crime = "Unknown"
    matched_keywords = []

    for crime_type, keywords in CRIME_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                detected_crime = crime_type
                matched_keywords.append(kw)
                break
        if detected_crime != "Unknown":
            break

    # --- Extract named entities ---
    locations = [ent.text for ent in doc.ents if ent.label_ in ("GPE", "LOC", "FAC")]
    persons   = [ent.text for ent in doc.ents if ent.label_ == "PERSON"]
    dates     = [ent.text for ent in doc.ents if ent.label_ in ("DATE", "TIME")]
    orgs      = [ent.text for ent in doc.ents if ent.label_ == "ORG"]

    # --- Extract time mentions ---
    time_pattern = r'\b(\d{1,2}:\d{2}\s?(?:am|pm)?|\d{1,2}\s?(?:am|pm))\b'
    times_found  = re.findall(time_pattern, text_lower)

    severity = SEVERITY_MAP.get(detected_crime, "Unknown")

    return {
        "crime_type":      detected_crime,
        "severity":        severity,
        "matched_keywords": matched_keywords,
        "locations":       locations,
        "persons_mentioned": persons,
        "dates":           dates,
        "times":           times_found,
        "organizations":   orgs,
        "word_count":      len(doc),
    }


def batch_extract(reports: List[str]) -> List[Dict]:
    """Process a list of police report texts."""
    return [extract_crime_info(r) for r in reports]


if __name__ == "__main__":
    sample_reports = [
        "At approximately 11:30 pm on Saturday, officers responded to a robbery "
        "on Michigan Avenue. The victim was held at gunpoint and had his wallet stolen. "
        "Suspect fled northbound on foot.",

        "A burglary was reported at 45 Oak Street. The suspect forced entry through "
        "the rear window and stole electronics and jewelry. Incident occurred around 3am.",

        "Officers arrested John Doe near Grant Park for drug possession. "
        "Suspect was found with cocaine and marijuana. Chicago PD vice unit involved.",
    ]

    for i, report in enumerate(sample_reports, 1):
        print(f"\n--- Report {i} ---")
        result = extract_crime_info(report)
        for k, v in result.items():
            print(f"  {k}: {v}")
