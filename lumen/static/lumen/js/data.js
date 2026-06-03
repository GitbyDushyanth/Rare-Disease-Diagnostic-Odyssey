/**
 * LUMEN OS - Master Mock Database
 * Contains realistic clinical, phenotypic, genomic, and trial data for rare diseases.
 */

const DISEASES_DB = [
    {
        id: "D001",
        name: "KCNQ2-Related Early Onset Epileptic Encephalopathy",
        gene: "KCNQ2",
        prevalence: "1 in 26,000 live births",
        inheritance: "Autosomal Dominant",
        hpo_terms: [
            { code: "HP:0001250", name: "Seizure" },
            { code: "HP:0001263", name: "Global developmental delay" },
            { code: "HP:0001290", name: "Generalized hypotonia" },
            { code: "HP:0011968", name: "Feeding difficulties" },
            { code: "HP:0002187", name: "Encephalopathy" }
        ],
        description: "A severe form of epilepsy characterized by seizures starting in the first week of life, accompanied by severe developmental delay, hypotonia, and intellectual disability. Caused by pathogenic variants in the KCNQ2 potassium channel gene.",
        management: "Sodium channel blockers (ezogabine, carbamazepine), seizure monitoring, physical and occupational therapy.",
        trials_count: 3
    },
    {
        id: "D002",
        name: "GLUT1 Deficiency Syndrome",
        gene: "SLC2A1",
        prevalence: "1 in 90,000",
        inheritance: "Autosomal Dominant / Recessive",
        hpo_terms: [
            { code: "HP:0001250", name: "Seizure" },
            { code: "HP:0001263", name: "Global developmental delay" },
            { code: "HP:0001251", name: "Ataxia" },
            { code: "HP:0000252", name: "Microcephaly" },
            { code: "HP:0002079", name: "Dystonia" }
        ],
        description: "A disorder of brain metabolism caused by impaired glucose transport across the blood-brain barrier. Classic symptoms include early-onset drug-resistant seizures, developmental delay, acquired microcephaly, and complex movement disorders (ataxia, dystonia).",
        management: "Ketogenic diet (provides alternative fuel for the brain), avoidance of glucose-blocking drugs.",
        trials_count: 5
    },
    {
        id: "D003",
        name: "Pompe Disease (Infantile-Onset Glycogen Storage Disease Type II)",
        gene: "GAA",
        prevalence: "1 in 40,000",
        inheritance: "Autosomal Recessive",
        hpo_terms: [
            { code: "HP:0001290", name: "Generalized hypotonia" },
            { code: "HP:0011968", name: "Feeding difficulties" },
            { code: "HP:0001627", name: "Cardiomegaly" },
            { code: "HP:0000975", name: "Hyperhidrosis" },
            { code: "HP:0000813", name: "Macroglossia" },
            { code: "HP:0005117", name: "Respiratory insufficiency" }
        ],
        description: "A progressive, multisystemic lysosomal storage disorder caused by deficiency of acid alpha-glucosidase (GAA), leading to glycogen accumulation. Classic infantile-onset presents with severe hypotonia, cardiomegaly, hepatomegaly, and respiratory distress.",
        management: "Enzyme Replacement Therapy (ERT) using alglucosidase alfa, respiratory support, high-protein diet.",
        trials_count: 2
    },
    {
        id: "D004",
        name: "Rett Syndrome",
        gene: "MECP2",
        prevalence: "1 in 10,000 females",
        inheritance: "X-linked Dominant",
        hpo_terms: [
            { code: "HP:0001263", name: "Global developmental delay" },
            { code: "HP:0001251", name: "Ataxia" },
            { code: "HP:0000252", name: "Microcephaly" },
            { code: "HP:0010818", name: "Stereotypic hand movements" },
            { code: "HP:0002376", name: "Loss of speech" },
            { code: "HP:0000739", name: "Anxiety" }
        ],
        description: "A progressive neurodevelopmental disorder almost exclusively affecting females. After a period of normal early development, infants experience a stagnation and regression of language and motor skills, accompanied by stereotypic wringing hand movements and breathing irregularities.",
        management: "Trofinetide, symptomatic therapies, speech and physical therapy.",
        trials_count: 4
    },
    {
        id: "D005",
        name: "Dravet Syndrome",
        gene: "SCN1A",
        prevalence: "1 in 15,700",
        inheritance: "Autosomal Dominant",
        hpo_terms: [
            { code: "HP:0001250", name: "Seizure" },
            { code: "HP:0001263", name: "Global developmental delay" },
            { code: "HP:0001251", name: "Ataxia" },
            { code: "HP:0002187", name: "Encephalopathy" },
            { code: "HP:0002359", name: "Frequent infections" }
        ],
        description: "A rare, drug-resistant epilepsy beginning in the first year of life with prolonged, febrile seizures. Over time, individuals develop developmental delays, ataxia, sleep disturbances, and hyperactivity. Primarily caused by de novo mutations in SCN1A.",
        management: "Fenfluramine, stiripentol, clobazam, cannabidiol. Avoidance of sodium channel blockers (which worsen seizures in SCN1A deficiency).",
        trials_count: 6
    },
    {
        id: "D006",
        name: "Alström Syndrome",
        gene: "ALMS1",
        prevalence: "1 in 1,000,000",
        inheritance: "Autosomal Recessive",
        hpo_terms: [
            { code: "HP:0000556", name: "Cone-rod dystrophy" },
            { code: "HP:0000407", name: "Sensorineural hearing impairment" },
            { code: "HP:0001513", name: "Obesity" },
            { code: "HP:0000827", name: "Type 2 diabetes mellitus" },
            { code: "HP:0001644", name: "Dilated cardiomyopathy" }
        ],
        description: "A rare, progressive autosomal recessive disorder characterized by cone-rod dystrophy, sensorineural hearing loss, childhood obesity, insulin resistance, type 2 diabetes, and dilated cardiomyopathy.",
        management: "Symptomatic treatment for diabetes, vision aids, hearing aids, cardiac support medication.",
        trials_count: 1
    }
];

const MOCK_CASES = [
    {
        id: "C001",
        patient_name: "Ethan Vance",
        age: "8 months",
        gender: "Male",
        parent_name: "Sarah Vance",
        status: "Undiagnosed (High Priority)",
        days_on_platform: 4,
        timeline: [
            { date: "2025-10-12", type: "symptom", title: "First Tonic-Clonic Seizure", description: "Bilateral tonic-clonic seizure lasting 3 minutes. Brief post-ictal period. Admitted to local ER.", tags: ["HP:0001250"] },
            { date: "2025-12-05", type: "symptom", title: "Hypotonia & Floppiness", description: "Pediatrician notes poor head control, hyper-flexible joints, and general muscle weakness.", tags: ["HP:0001290"] },
            { date: "2026-02-18", type: "clinical", title: "Developmental Delay Flagged", description: "Not rolling over, lack of vocalizations, and poor tracking of objects in field of view.", tags: ["HP:0001263"] },
            { date: "2026-05-10", type: "symptom", title: "Swallowing difficulties", description: "Choking during breast feeding and choking on formula feeds. Referred for swallow study.", tags: ["HP:0011968"] }
        ],
        raw_clinical_notes: "Patient is an 8-month-old male infant who presents with recurrent generalized tonic-clonic seizures. Developmental milestones are severely delayed: he is not sitting up or rolling over. Muscle tone is significantly reduced (generalized hypotonia), with poor head lag. Mother notes feeding difficulties with choking episodes on liquids.",
        suggested_hpo: ["HP:0001250", "HP:0001290", "HP:0001263", "HP:0011968"],
        pedigree_data: {
            maternal_history: "Uncle has childhood-onset epilepsy (now resolved)",
            paternal_history: "Healthy, no neurological issues",
            inheritance_path: "Autosomal Dominant (Likely De Novo)"
        }
    },
    {
        id: "C002",
        patient_name: "Mia Thorne",
        age: "2.5 years",
        gender: "Female",
        parent_name: "David Thorne",
        status: "Sequencing Completed",
        days_on_platform: 12,
        timeline: [
            { date: "2024-06-01", type: "symptom", title: "Loss of Speech", description: "Stop using words previously learned (mama, dada, ball). Regression of developmental milestones.", tags: ["HP:0002376"] },
            { date: "2024-11-20", type: "symptom", title: "Stereotypic Hand Movements", description: "Constant hand-wringing and hand-washing motions, worsening during fatigue.", tags: ["HP:0010818"] },
            { date: "2025-04-15", type: "symptom", title: "Gait Ataxia", description: "Wide-based unstable walking gait, frequent stumbles and inability to maintain straight balance.", tags: ["HP:0001251"] },
            { date: "2026-01-05", type: "clinical", title: "Acquired Microcephaly", description: "Slowing of head growth relative to body length, falling below the 2nd percentile.", tags: ["HP:0000252"] }
        ],
        raw_clinical_notes: "2.5-year-old female showing progressive developmental regression. Previously able to speak single words and crawl, she has lost all functional speech (loss of speech) and exhibits gait ataxia. She displays stereotypic hand movements, specifically continuous hand wringing. Physical exam reveals head circumference below the 3rd percentile, indicative of acquired microcephaly.",
        suggested_hpo: ["HP:0001263", "HP:0002376", "HP:0010818", "HP:0001251", "HP:0000252"],
        pedigree_data: {
            maternal_history: "No history of regression",
            paternal_history: "No abnormalities",
            inheritance_path: "X-Linked Dominant"
        }
    },
    {
        id: "C003",
        patient_name: "Liam O'Connor",
        age: "1.2 years",
        gender: "Male",
        parent_name: "Fiona O'Connor",
        status: "Undiagnosed",
        days_on_platform: 2,
        timeline: [
            { date: "2025-08-10", type: "symptom", title: "Hypotonia & Muscle Weakness", description: "Slumped posture, low muscle tone in limbs.", tags: ["HP:0001290"] },
            { date: "2025-11-01", type: "clinical", title: "Cardiomegaly", description: "Echocardiogram reveals enlarged heart walls with decreased ejection fraction.", tags: ["HP:0001627"] },
            { date: "2026-03-22", type: "symptom", title: "Respiratory Problems", description: "Frequent respiratory infections and shortness of breath, requiring supplemental oxygen during sleep.", tags: ["HP:0005117"] }
        ],
        raw_clinical_notes: "14-month-old male presenting with severe failure to thrive, generalized hypotonia ('floppy infant'), and progressive muscle weakness. Diagnostic workup shows cardiomegaly and respiratory insufficiency. Feeding difficulties are prominent, with recurrent reflux.",
        suggested_hpo: ["HP:0001290", "HP:0001627", "HP:0005117", "HP:0011968"],
        pedigree_data: {
            maternal_history: "Healthy, no heart diseases",
            paternal_history: "Healthy, minor asthma",
            inheritance_path: "Autosomal Recessive"
        }
    }
];

const VCF_VARIANTS = [
    {
        chr: "chr20",
        pos: "63412588",
        ref: "C",
        alt: "T",
        gene: "KCNQ2",
        mutation: "c.1741C>T (p.Arg581Trp)",
        consequence: "Missense Variant",
        frequency: "0.000002 (GnomAD)",
        cadd: 28.4,
        clinvar: "Pathogenic / Likely Pathogenic",
        acmg: "Pathogenic (PS1 + PM2 + PP3)",
        patient_match: "C001",
        status: "Prioritized",
        validation: "De novo mutation, confirmed by parental Sanger sequencing."
    },
    {
        chr: "chrX",
        pos: "154030588",
        ref: "G",
        alt: "A",
        gene: "MECP2",
        mutation: "c.502C>T (p.Arg168X)",
        consequence: "Nonsense Variant",
        frequency: "0.000000 (GnomAD)",
        cadd: 35.0,
        clinvar: "Pathogenic",
        acmg: "Pathogenic (PVS1 + PM2 + PP3)",
        patient_match: "C002",
        status: "Prioritized",
        validation: "De novo nonsense mutation causing premature termination codon."
    },
    {
        chr: "chr17",
        pos: "80110822",
        ref: "A",
        alt: "G",
        gene: "GAA",
        mutation: "c.1935C>A (p.Asp645Glu)",
        consequence: "Missense Variant",
        frequency: "0.00015 (GnomAD)",
        cadd: 22.1,
        clinvar: "Pathogenic (Compound Heterozygous)",
        acmg: "Likely Pathogenic (PM2 + PP3 + PP4)",
        patient_match: "C003",
        status: "Under Review",
        validation: "Maternally inherited; second allele c.-32-13T>G detected in trans."
    },
    {
        chr: "chr1",
        pos: "42899651",
        ref: "T",
        alt: "C",
        gene: "SLC2A1",
        mutation: "c.421G>A (p.Gly141Ser)",
        consequence: "Missense Variant",
        frequency: "0.000005 (GnomAD)",
        cadd: 26.8,
        clinvar: "Likely Pathogenic",
        acmg: "Likely Pathogenic (PM2 + PP3)",
        patient_match: null,
        status: "Unresolved",
        validation: "Associated with GLUT1 Deficiency Syndrome. Candidate."
    },
    {
        chr: "chr2",
        pos: "166124538",
        ref: "G",
        alt: "A",
        gene: "SCN1A",
        mutation: "c.2812C>T (p.Arg938Cys)",
        consequence: "Missense Variant",
        frequency: "0.000012 (GnomAD)",
        cadd: 24.3,
        clinvar: "VUS (Variant of Uncertain Significance)",
        acmg: "VUS (BP4 + PM2)",
        patient_match: null,
        status: "Filtered",
        validation: "In silico predictors disagree. Frequency is slightly high."
    }
];

const CLINICAL_TRIALS = [
    {
        nct_id: "NCT05234588",
        title: "Efficacy and Safety of Ezogabine in KCNQ2-Related Encephalopathy",
        sponsor: "Xenon Pharmaceuticals Inc.",
        phase: "Phase II",
        condition: "KCNQ2-Related Early Onset Epileptic Encephalopathy",
        gene_target: "KCNQ2",
        eligibility: "Infants aged 1-12 months with genetically confirmed KCNQ2 pathogenic variants and drug-resistant seizures.",
        status: "Recruiting",
        location: "Boston Children's Hospital, Boston, MA"
    },
    {
        nct_id: "NCT04899503",
        title: "Natural History Study of GLUT1 Deficiency Syndrome (GLUT1-DS)",
        sponsor: "UT Southwestern Medical Center",
        phase: "Observational",
        condition: "GLUT1 Deficiency Syndrome",
        gene_target: "SLC2A1",
        eligibility: "Individuals of all ages with a confirmed diagnosis of GLUT1-DS based on CSF glucose ratio or SLC2A1 gene sequencing.",
        status: "Active, not recruiting",
        location: "Dallas, Texas, United States"
    },
    {
        nct_id: "NCT05988214",
        title: "A Study of Trofinetide in Pediatric Subjects with Rett Syndrome",
        sponsor: "Acadia Pharmaceuticals Inc.",
        phase: "Phase III",
        condition: "Rett Syndrome",
        gene_target: "MECP2",
        eligibility: "Female patients aged 2 to 5 years meeting clinical diagnostic criteria for Rett Syndrome with MECP2 mutation.",
        status: "Completed",
        location: "Children's Hospital Colorado, Aurora, CO"
    },
    {
        nct_id: "NCT06212450",
        title: "Enzyme Replacement Therapy with AT-GAA in Infantile-Onset Pompe Disease",
        sponsor: "Amicus Therapeutics",
        phase: "Phase III",
        condition: "Pompe Disease",
        gene_target: "GAA",
        eligibility: "Genetically confirmed infantile-onset Pompe disease presenting with cardiomegaly, aged under 6 months.",
        status: "Recruiting",
        location: "Great Ormond Street Hospital, London, UK"
    }
];

// Helper dictionaries for parsing text to HPO terms
const HPO_DICTIONARY = {
    "seizure": { code: "HP:0001250", name: "Seizure" },
    "seizures": { code: "HP:0001250", name: "Seizure" },
    "convulsion": { code: "HP:0001250", name: "Seizure" },
    "convulsions": { code: "HP:0001250", name: "Seizure" },
    "epilepsy": { code: "HP:0001250", name: "Seizure" },
    
    "developmental delay": { code: "HP:0001263", name: "Global developmental delay" },
    "delay": { code: "HP:0001263", name: "Global developmental delay" },
    "regression": { code: "HP:0001263", name: "Global developmental delay" },
    "delayed milestone": { code: "HP:0001263", name: "Global developmental delay" },
    
    "hypotonia": { code: "HP:0001290", name: "Generalized hypotonia" },
    "floppy": { code: "HP:0001290", name: "Generalized hypotonia" },
    "low muscle tone": { code: "HP:0001290", name: "Generalized hypotonia" },
    "weakness": { code: "HP:0001290", name: "Generalized hypotonia" },
    
    "feeding difficulty": { code: "HP:0011968", name: "Feeding difficulties" },
    "feeding difficulties": { code: "HP:0011968", name: "Feeding difficulties" },
    "choking": { code: "HP:0011968", name: "Feeding difficulties" },
    "swallowing difficulty": { code: "HP:0011968", name: "Feeding difficulties" },
    
    "ataxia": { code: "HP:0001251", name: "Ataxia" },
    "unsteady gait": { code: "HP:0001251", name: "Ataxia" },
    "stumbling": { code: "HP:0001251", name: "Ataxia" },
    "balance": { code: "HP:0001251", name: "Ataxia" },
    
    "microcephaly": { code: "HP:0000252", name: "Microcephaly" },
    "small head": { code: "HP:0000252", name: "Microcephaly" },
    
    "cardiomegaly": { code: "HP:0001627", name: "Cardiomegaly" },
    "enlarged heart": { code: "HP:0001627", name: "Cardiomegaly" },
    
    "sweating": { code: "HP:0000975", name: "Hyperhidrosis" },
    "hyperhidrosis": { code: "HP:0000975", name: "Hyperhidrosis" },
    
    "respiratory failure": { code: "HP:0005117", name: "Respiratory insufficiency" },
    "respiratory distress": { code: "HP:0005117", name: "Respiratory insufficiency" },
    "breathing difficulty": { code: "HP:0005117", name: "Respiratory insufficiency" },
    
    "dystonia": { code: "HP:0002079", name: "Dystonia" },
    "spasms": { code: "HP:0002079", name: "Dystonia" },
    
    "hand movements": { code: "HP:0010818", name: "Stereotypic hand movements" },
    "hand wringing": { code: "HP:0010818", name: "Stereotypic hand movements" },
    
    "loss of speech": { code: "HP:0002376", name: "Loss of speech" },
    "speech regression": { code: "HP:0002376", name: "Loss of speech" }
};
