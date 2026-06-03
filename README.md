
# Rare-Disease-Diagnostic-Odyssey
=======
# LUMEN OS - Rare Disease Operating System

LUMEN is an integrated, longitudinal rare disease intelligence platform designed to compress the rare disease diagnostic odyssey from years to weeks. 

This repository contains the high-fidelity, interactive multi-stakeholder frontend application built as a Python Django project.

---

## Key Modules Implemented

1. **LUMEN Clinician**: EHR-integrated clinical notes parser and phenotype similarity engine (HPO term matcher).
2. **LUMEN Patient**: Simulated mobile UI containing patient timelines, trial selectors, and an interactive pedigree chart builder.
3. **LUMEN Lab**: Genomics workstation VCF browser, ACMG classification checklist, and wireframe 3D protein structure mutation visualization.
4. **LUMEN Intelligence**: Cohort builder filters, dynamic SV bar charts, and a world epidemiological heatmap projection.

---

## Directory Structure

```
lumen_os/
│
├── manage.py
├── .gitignore
├── README.md
│
├── lumen_os/                  # Django project configuration
│   ├── settings.py            
│   └── urls.py                
│
└── lumen/                     # App containing frontend templates/static
    ├── views.py               
    ├── urls.py                
    ├── templates/
    │   └── lumen/
    │       └── index.html     # HTML Layout
    └── static/
        └── lumen/
            ├── css/
            │   └── styles.css # Design styles (glassmorphism, dark-theme)
            └── js/
                ├── data.js    # Biological datasets
                └── app.js     # Interactivity engine
```

---

## How to Run Locally

### 1. Prerequisites
Make sure you have Python 3.8+ and Django installed:
```bash
pip install django
```

### 2. Run Database Migrations
Initialize the sqlite database configuration:
```bash
python manage.py migrate
```

### 3. Start Development Server
Run the local dev server:
```bash
python manage.py runserver
```

Open your browser and navigate to **`http://127.0.0.1:8000/`**.

