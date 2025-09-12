from models import db, Location
from app import app

LOC_SEED = [
    # --- Academic/Administrative ---
    {"code":"AH", "name":"Alumni House"},
    {"code":"AN", "name":"ANsys Hall"},
    {"code":"BH", "name":"Baker Hall"},
    {"code":"BK", "name":"Barclay Square"},
    {"code":"BR", "name":"Bramer House"},
    {"code":"CUC", "name":"Cohon University Center"},
    {"code":"CFA", "name":"College of Fine Arts"},
    {"code":"CYT", "name":"Cyert Hall"},
    {"code":"DH", "name":"Doherty Hall"},
    {"code":"FM", "name":"Facilities Management Services Building"},
    {"code":"FR", "name":"FMS Roads & Grounds"},
    {"code":"GES", "name":"Gates Center for Computer Science"},
    {"code":"HOA", "name":"Hall of the Arts"},
    {"code":"HBH", "name":"Hamburg Hall"},
    {"code":"HMC", "name":"H. John Heinz III College / Center for Health, Wellness and Athletics"},
    {"code":"HUC", "name":"Hunt Library"},
    {"code":"MM", "name":"Margaret Morrison Hall"},
    {"code":"MUD", "name":"Mudge House"},
    {"code":"MCG", "name":"McGill House"},
    {"code":"MOR", "name":"Morewood Gardens"},
    {"code":"MORC", "name":"Morewood Gardens C Tower"},
    {"code":"NHL", "name":"Newell-Simon Hall"},
    {"code":"POS", "name":"Posner Center"},
    {"code":"PH", "name":"Posner Hall"},
    {"code":"REH", "name":"Roberts Engineering Hall"},
    {"code":"SC", "name":"Software Engineering Institute"},
    {"code":"TEP", "name":"Tepper Building"},
    {"code":"UC", "name":"Cohon University Center"},
    {"code":"WEH", "name":"Wean Hall"},
    {"code":"WWG", "name":"West Wing"},
    {"code":"MI", "name":"Mellon Institute"},
    {"code":"PTC", "name":"Pittsburgh Technology Center"},
    {"code":"M19", "name":"Mellon Institute (M19)"},

    # --- Points of Interest ---
    {"code":"WC", "name":"Coulter Welcome Center"},
    {"code":"AD", "name":"Office of Undergraduate Admission"},
    {"code":"DI", "name":"Center for Student Diversity & Inclusion"},
    {"code":"DS", "name":"Dining Services"},
    {"code":"DR", "name":"Disability Resources"},
    {"code":"EN", "name":"Entropy Convenience Store"},
    {"code":"FC", "name":"Fifth Avenue Neighborhood Commons"},
    {"code":"FCL", "name":"Frame Gallery"},
    {"code":"FRD", "name":"Furnace House"},
    {"code":"HU", "name":"The Hub"},
    {"code":"HR", "name":"Human Resources"},
    {"code":"KP", "name":"Kraus Campo"},
    {"code":"MC", "name":"McConomy Auditorium"},
    {"code":"MI", "name":"Miller ICA"},
    {"code":"CFA", "name":"College of Fine Arts Great Hall"},
    {"code":"PA", "name":"Purnell Center for the Arts"},
    {"code":"PH", "name":"Posner Hall"},
    {"code":"SF", "name":"Skibo Gym"},
    {"code":"SL", "name":"Smith Hall"},
    {"code":"SS", "name":"Student Academic Success Center"},
    {"code":"WS", "name":"Walking to the Sky"},
    {"code":"UPD", "name":"University Police Department"},

    # --- Residential ---
    {"code":"BOS", "name":"Boss House"},
    {"code":"CYH", "name":"Clyde House"},
    {"code":"DON", "name":"Donner House"},
    {"code":"HOU", "name":"Highland Apartments"},
    {"code":"FSA", "name":"Fifth and Clyde House"},
    {"code":"FSC", "name":"Fifth and Clyde Apartments"},
    {"code":"FBA", "name":"Fifth and Clyde Apartments FBA"},
    {"code":"GQ", "name":"Greek Quad"},
    {"code":"HAM", "name":"Hamerschlag House"},

    # --- Parking ---
    {"code":"ECG", "name":"East Campus Garage"},
    {"code":"GH", "name":"Dithridge Garage"},
    {"code":"MMG", "name":"Margaret Morrison Street Garage"},
    {"code":"PHG", "name":"Panther Hollow Garage"},
    {"code":"RPG", "name":"Roberts Parking Garage"},

    # --- Colleges and Schools ---
    {"code":"ENG", "name":"College of Engineering"},
    {"code":"CFA", "name":"College of Fine Arts"},
    {"code":"DC", "name":"Dietrich College of Humanities & Social Sciences"},
    {"code":"HC", "name":"Heinz College of Information Systems and Public Policy"},
    {"code":"MCS", "name":"Mellon College of Science"},
    {"code":"SCS", "name":"School of Computer Science"},
    {"code":"TBS", "name":"Tepper School of Business"},

    # --- Off Campus (map abbreviations) ---
    {"code":"WQ", "name":"WQED Building"},
    {"code":"35C", "name":"305 S. Craig"},
    {"code":"35B", "name":"311 S. Craig"},
    {"code":"45C", "name":"407 S. Craig"},
    {"code":"45A", "name":"415 S. Craig"},
    {"code":"46C", "name":"4609 Winthrop"},
    {"code":"46I", "name":"4615 Henry"},
    {"code":"PO", "name":"4620 Henry"},
    {"code":"MEL", "name":"477 Melwood Ave"},
    {"code":"MEL2", "name":"6555 Penn"},
]
with app.app_context():
    for loc in LOC_SEED:
        if not Location.query.filter_by(code=loc["code"]).first():
            db.session.add(Location(**loc))
    db.session.commit()
    print(f"✅ Seeded {len(LOC_SEED)} locations")
