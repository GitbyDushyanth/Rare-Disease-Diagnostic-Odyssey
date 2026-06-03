/**
 * LUMEN OS - Interactive Logic & UI Controller
 */

// Application State
let appState = {
    activePortal: "clinician", // Default view
    selectedPatientId: "C001",
    selectedVariantIndex: 0,
    patientHpoTerms: [],
    customPedigree: [
        { id: "M1", x: 120, y: 70, gender: "male", status: "normal", relation: "Father" },
        { id: "F1", x: 220, y: 70, gender: "female", status: "normal", relation: "Mother" },
        { id: "M2", x: 60, y: 70, gender: "male", status: "carrier", relation: "Maternal Uncle" },
        { id: "P1", x: 170, y: 170, gender: "male", status: "affected", relation: "Proband (Ethan)" }
    ]
};

document.addEventListener("DOMContentLoaded", () => {
    initPortalNavigation();
    loadPatientQueue();
    loadPatientDetails(appState.selectedPatientId);
    initLabWorkspace();
    initAnalyticsDashboard();
    
    // Set initial active portal view
    switchPortal(appState.activePortal);
});

// --- Portal Navigation ---
function initPortalNavigation() {
    const navItems = document.querySelectorAll(".nav-item[data-portal]");
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const portalName = item.getAttribute("data-portal");
            switchPortal(portalName);
        });
    });
}

function switchPortal(portalName) {
    appState.activePortal = portalName;
    
    // Update Sidebar Navigation highlights
    document.querySelectorAll(".nav-item[data-portal]").forEach(item => {
        if (item.getAttribute("data-portal") === portalName) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });
    
    // Update Portal Views
    document.querySelectorAll(".portal-view").forEach(view => {
        if (view.id === `${portalName}-portal`) {
            view.classList.add("active");
        } else {
            view.classList.remove("active");
        }
    });

    // Trigger specific animations / re-draws when tabs switch
    if (portalName === "lab") {
        startProteinAnimation();
    } else if (portalName === "intelligence") {
        animateCohortBars();
        startEpidemiologyMapAnimation();
    }
}

// --- Clinician Portal Functions ---
function loadPatientQueue() {
    const queueContainer = document.getElementById("clinical-queue");
    if (!queueContainer) return;
    
    queueContainer.innerHTML = "";
    MOCK_CASES.forEach(patient => {
        const isSelected = patient.id === appState.selectedPatientId;
        const card = document.createElement("div");
        card.className = `queue-patient-card ${isSelected ? 'selected' : ''}`;
        card.setAttribute("data-id", patient.id);
        
        card.innerHTML = `
            <div>
                <h4 style="font-weight:600; font-size:14px; margin-bottom:4px;">${patient.patient_name}</h4>
                <p style="font-size:12px; color:var(--text-secondary);">${patient.age} • ${patient.gender}</p>
            </div>
            <div>
                <span class="badge ${patient.status.includes('High') ? 'badge-red' : 'badge-purple'}">${patient.status}</span>
            </div>
        `;
        
        card.addEventListener("click", () => {
            document.querySelectorAll(".queue-patient-card").forEach(c => c.classList.remove("selected"));
            card.classList.add("selected");
            appState.selectedPatientId = patient.id;
            loadPatientDetails(patient.id);
        });
        
        queueContainer.appendChild(card);
    });
}

function loadPatientDetails(patientId) {
    const patient = MOCK_CASES.find(c => c.id === patientId);
    if (!patient) return;
    
    // Update Patient Profile Header
    document.getElementById("detail-patient-name").innerText = patient.patient_name;
    document.getElementById("detail-patient-meta").innerText = `${patient.gender} • Age ${patient.age} • Case ID: ${patient.id}`;
    
    // Update Clinician Note input
    document.getElementById("clinician-notes-input").value = patient.raw_clinical_notes;
    
    // Load HPO tags
    appState.patientHpoTerms = [...patient.suggested_hpo];
    renderHpoTags();
    
    // Update Similarity Matrix
    calculatePhenotypicSimilarity();
    
    // Load timeline in Patient App Simulator
    renderSimulatorTimeline(patient);
    
    // Render Pedigree Chart
    renderPedigreeChart();
}

function renderHpoTags() {
    const tagBox = document.getElementById("selected-hpo-tags");
    if (!tagBox) return;
    tagBox.innerHTML = "";
    
    appState.patientHpoTerms.forEach(code => {
        // Find in dictionary or default
        let termName = "Unknown Term";
        for (const [key, value] of Object.entries(HPO_DICTIONARY)) {
            if (value.code === code) {
                termName = value.name;
                break;
            }
        }
        
        const tag = document.createElement("span");
        tag.className = "hpo-tag";
        tag.innerHTML = `
            <span>${termName} (${code})</span>
            <i class="fas fa-times" onclick="removeHpoTerm('${code}')"></i>
        `;
        tagBox.appendChild(tag);
    });
}

function removeHpoTerm(code) {
    appState.patientHpoTerms = appState.patientHpoTerms.filter(t => t !== code);
    renderHpoTags();
    calculatePhenotypicSimilarity();
}

function addHpoTerm(code, name) {
    if (!appState.patientHpoTerms.includes(code)) {
        appState.patientHpoTerms.push(code);
        renderHpoTags();
        calculatePhenotypicSimilarity();
    }
}

// Simulated NLP clinical note parsing
function runNlpNoteParser() {
    const notes = document.getElementById("clinician-notes-input").value.toLowerCase();
    const parseBtn = document.getElementById("parse-note-btn");
    
    // Add pulsing load effect
    parseBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Parsing clinical notes...`;
    
    setTimeout(() => {
        // Find matches based on keywords in dictionary
        let matchedCodes = [];
        for (const [keyword, term] of Object.entries(HPO_DICTIONARY)) {
            if (notes.includes(keyword)) {
                if (!matchedCodes.includes(term.code)) {
                    matchedCodes.push(term.code);
                }
            }
        }
        
        // Add to active patient HPO list
        matchedCodes.forEach(code => {
            if (!appState.patientHpoTerms.includes(code)) {
                appState.patientHpoTerms.push(code);
            }
        });
        
        renderHpoTags();
        calculatePhenotypicSimilarity();
        
        parseBtn.innerHTML = `<i class="fas fa-microchip"></i> Run AI Note Parser`;
    }, 800);
}

// Phenotypic Similarity Calculation (Jaccard-like index for presentation)
function calculatePhenotypicSimilarity() {
    const tableBody = document.getElementById("disease-matches-body");
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    
    if (appState.patientHpoTerms.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No HPO phenotype terms active. Enter symptoms above.</td></tr>`;
        return;
    }
    
    let scores = [];
    
    DISEASES_DB.forEach(disease => {
        // Find intersection
        let matches = [];
        disease.hpo_terms.forEach(t => {
            if (appState.patientHpoTerms.includes(t.code)) {
                matches.push(t);
            }
        });
        
        // Calculate similarity metric: Jaccard intersection
        let unionCount = new Set([...appState.patientHpoTerms, ...disease.hpo_terms.map(t => t.code)]).size;
        let score = unionCount > 0 ? (matches.length / unionCount) : 0;
        
        // Boost score slightly if gene is specifically matched in prioritized list
        scores.push({
            disease: disease,
            matches: matches,
            score: Math.round(score * 100)
        });
    });
    
    // Sort scores descending
    scores.sort((a, b) => b.score - a.score);
    
    // Render sorted list
    scores.forEach(item => {
        const row = document.createElement("tr");
        
        // Format matching terms list
        let matchesList = item.matches.map(m => `<span style="color:var(--accent-cyan); font-weight:500;">${m.name}</span>`).join(", ");
        if (item.matches.length === 0) matchesList = `<span style="color:var(--text-muted);">No overlap</span>`;
        
        row.innerHTML = `
            <td style="font-weight:600;">${item.disease.name} <span style="font-size:11px; color:var(--accent-purple); display:block;">Target Gene: ${item.disease.gene}</span></td>
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-weight:700; width:35px;">${item.score}%</span>
                    <div class="similarity-bar-container">
                        <div class="similarity-bar-fill" style="width: ${item.score}%"></div>
                    </div>
                </div>
            </td>
            <td style="font-size:12px; max-width:200px;">${matchesList}</td>
            <td>
                <button class="btn btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="triggerGenomicQuery('${item.disease.gene}')">
                    Query VCF
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function triggerGenomicQuery(geneName) {
    switchPortal("lab");
    const vcfSearchInput = document.getElementById("vcf-gene-search");
    if (vcfSearchInput) {
        vcfSearchInput.value = geneName;
        filterVcfTable();
    }
}

// --- Patient Portal Simulator (Phone View) ---
function renderSimulatorTimeline(patient) {
    const timelineBox = document.getElementById("sim-timeline");
    if (!timelineBox) return;
    
    timelineBox.innerHTML = "";
    patient.timeline.forEach(event => {
        const item = document.createElement("div");
        item.className = "mobile-timeline-item";
        
        item.innerHTML = `
            <div class="mobile-timeline-dot ${event.type}"></div>
            <div class="mobile-card">
                <span style="font-size:10px; color:var(--text-muted); float:right;">${event.date}</span>
                <h5 style="font-size:13px; font-weight:600; margin-bottom:4px;">${event.title}</h5>
                <p style="font-size:11px; color:var(--text-secondary); line-height:1.4;">${event.description}</p>
            </div>
        `;
        timelineBox.appendChild(item);
    });
    
    // Update pedigree preview details
    document.getElementById("sim-inheritance-type").innerText = patient.pedigree_data.inheritance_path;
}

// Simple interactive symptom entry in phone simulator
function addSimulatedSymptom() {
    const input = document.getElementById("sim-symptom-input");
    const text = input.value.trim().toLowerCase();
    if (!text) return;
    
    // Look up in dictionary
    let found = false;
    for (const [keyword, term] of Object.entries(HPO_DICTIONARY)) {
        if (text.includes(keyword)) {
            addHpoTerm(term.code, term.name);
            found = true;
            
            // Add to simulated timeline on phone
            const currentPatient = MOCK_CASES.find(c => c.id === appState.selectedPatientId);
            if (currentPatient) {
                const today = new Date().toISOString().split('T')[0];
                currentPatient.timeline.push({
                    date: today,
                    type: "symptom",
                    title: `Patient Logged: ${term.name}`,
                    description: `Symptom "${text}" logged by caregiver via LUMEN Mobile. Auto-translated to ${term.code}.`,
                    tags: [term.code]
                });
                renderSimulatorTimeline(currentPatient);
            }
            break;
        }
    }
    
    if (!found) {
        alert(`Symptom registered, but no matching HPO mapping found. Adding to clinical notes review queue.`);
    }
    
    input.value = "";
}

// --- Pedigree Chart Rendering (SVG Drawing) ---
function renderPedigreeChart() {
    const svg = document.getElementById("pedigree-svg");
    if (!svg) return;
    
    svg.innerHTML = "";
    
    // Draw connections lines
    // Mother - Father connection line
    const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line1.setAttribute("x1", "120");
    line1.setAttribute("y1", "70");
    line1.setAttribute("x2", "220");
    line1.setAttribute("y2", "70");
    line1.setAttribute("class", "pedigree-line");
    svg.appendChild(line1);
    
    // Child connection line
    const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line2.setAttribute("x1", "170");
    line2.setAttribute("y1", "70");
    line2.setAttribute("x2", "170");
    line2.setAttribute("y2", "155");
    line2.setAttribute("class", "pedigree-line");
    svg.appendChild(line2);
    
    // Uncle connection line
    const line3 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line3.setAttribute("x1", "60");
    line3.setAttribute("y1", "70");
    line3.setAttribute("x2", "120");
    line3.setAttribute("y2", "70");
    line3.setAttribute("class", "pedigree-line");
    svg.appendChild(line3);

    // Draw Nodes
    appState.customPedigree.forEach(node => {
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.className.baseVal = "pedigree-node";
        group.setAttribute("onclick", `togglePedigreeNode('${node.id}')`);
        
        let shape;
        
        if (node.gender === "male") {
            // Draw Square
            shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            shape.setAttribute("x", node.x - 15);
            shape.setAttribute("y", node.y - 15);
            shape.setAttribute("width", "30");
            shape.setAttribute("height", "30");
        } else {
            // Draw Circle
            shape = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            shape.setAttribute("cx", node.x);
            shape.setAttribute("cy", node.y);
            shape.setAttribute("r", "15");
        }
        
        // Color node based on status
        let fillColor = "transparent";
        let strokeColor = "var(--text-secondary)";
        
        if (node.status === "affected") {
            fillColor = "var(--accent-red)";
            strokeColor = "var(--accent-red)";
        } else if (node.status === "carrier") {
            // Half fill for carrier
            fillColor = "rgba(179, 136, 255, 0.4)";
            strokeColor = "var(--accent-purple)";
        }
        
        shape.setAttribute("fill", fillColor);
        shape.setAttribute("stroke", strokeColor);
        shape.setAttribute("stroke-width", "2");
        group.appendChild(shape);
        
        // Text labels
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", node.x);
        label.setAttribute("y", node.y + 30);
        label.setAttribute("fill", "var(--text-secondary)");
        label.setAttribute("font-size", "10px");
        label.setAttribute("text-anchor", "middle");
        label.textContent = node.relation;
        group.appendChild(label);
        
        svg.appendChild(group);
    });
}

function togglePedigreeNode(nodeId) {
    const node = appState.customPedigree.find(n => n.id === nodeId);
    if (!node) return;
    
    // Rotate status: normal -> carrier -> affected -> normal
    if (node.status === "normal") {
        node.status = "carrier";
    } else if (node.status === "carrier") {
        node.status = "affected";
    } else {
        node.status = "normal";
    }
    
    renderPedigreeChart();
}

// --- Lab Workstation Portal ---
function initLabWorkspace() {
    loadVcfTable();
    loadVariantDetails(appState.selectedVariantIndex);
    
    // Add searching listener
    const searchInput = document.getElementById("vcf-gene-search");
    if (searchInput) {
        searchInput.addEventListener("input", filterVcfTable);
    }
}

function loadVcfTable() {
    const tableBody = document.getElementById("vcf-variants-body");
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    VCF_VARIANTS.forEach((variant, index) => {
        const row = document.createElement("tr");
        row.className = `vcf-row ${index === appState.selectedVariantIndex ? 'selected' : ''}`;
        row.setAttribute("data-index", index);
        
        let pathClass = "badge-cyan";
        if (variant.clinvar.includes("Pathogenic")) pathClass = "badge-red";
        else if (variant.clinvar.includes("VUS")) pathClass = "badge-orange";
        
        row.innerHTML = `
            <td style="font-family:monospace;">${variant.chr}:${variant.pos}</td>
            <td><strong style="color:var(--accent-cyan);">${variant.gene}</strong></td>
            <td style="font-size:11px; color:var(--text-secondary);">${variant.mutation}</td>
            <td><span class="badge ${pathClass}" style="font-size:9px;">${variant.clinvar.split(" ")[0]}</span></td>
            <td><strong style="color:var(--accent-purple);">${variant.cadd}</strong></td>
        `;
        
        row.addEventListener("click", () => {
            document.querySelectorAll(".vcf-row").forEach(r => r.classList.remove("selected"));
            row.classList.add("selected");
            appState.selectedVariantIndex = index;
            loadVariantDetails(index);
        });
        
        tableBody.appendChild(row);
    });
}

function filterVcfTable() {
    const query = document.getElementById("vcf-gene-search").value.toUpperCase().trim();
    const rows = document.querySelectorAll(".vcf-row");
    
    rows.forEach(row => {
        const idx = parseInt(row.getAttribute("data-index"));
        const variant = VCF_VARIANTS[idx];
        if (variant.gene.includes(query) || variant.chr.toUpperCase().includes(query) || variant.mutation.toUpperCase().includes(query)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}

function loadVariantDetails(index) {
    const variant = VCF_VARIANTS[index];
    if (!variant) return;
    
    // Load text elements
    document.getElementById("vcf-detail-gene").innerText = `${variant.gene} Variant`;
    document.getElementById("vcf-detail-mutation").innerText = `${variant.mutation} (${variant.consequence})`;
    document.getElementById("vcf-detail-coordinates").innerText = `Locus: ${variant.chr}:${variant.pos} [${variant.ref} > ${variant.alt}]`;
    document.getElementById("vcf-detail-freq").innerText = variant.frequency;
    document.getElementById("vcf-detail-cadd").innerText = variant.cadd;
    document.getElementById("vcf-detail-clinvar").innerText = variant.clinvar;
    document.getElementById("vcf-detail-validation").innerText = variant.validation;
    
    // Interactive ACMG Classification Checkboxes
    const acmgContainer = document.getElementById("acmg-checklist-boxes");
    if (acmgContainer) {
        acmgContainer.innerHTML = "";
        
        // Define ACMG Criteria
        const criteria = [
            { code: "PVS1", type: "Pathogenic Very Strong", desc: "Null variant in gene where LoF is disease mechanism", active: variant.acmg.includes("PVS1") },
            { code: "PS1", type: "Pathogenic Strong", desc: "Same amino acid change as previously established pathogenic variant", active: variant.acmg.includes("PS1") },
            { code: "PM2", type: "Pathogenic Moderate", desc: "Absent/rare in control populations (GnomAD)", active: variant.acmg.includes("PM2") },
            { code: "PP3", type: "Pathogenic Supporting", desc: "Multiple lines of computational evidence support deleterious effect", active: variant.acmg.includes("PP3") },
            { code: "PP4", type: "Pathogenic Supporting", desc: "Patient phenotype highly specific for gene etiology", active: variant.acmg.includes("PP4") }
        ];
        
        criteria.forEach(crit => {
            const box = document.createElement("div");
            box.className = `acmg-box ${crit.active ? 'active' : ''}`;
            box.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <strong style="color:var(--accent-cyan); font-size:13px;">${crit.code}</strong>
                    <span style="font-size:9px; color:var(--text-secondary); text-transform:uppercase;">${crit.type.split(" ")[1]}</span>
                </div>
                <p style="font-size:10px; color:inherit; line-height:1.3;">${crit.desc}</p>
            `;
            
            box.addEventListener("click", () => {
                crit.active = !crit.active;
                box.classList.toggle("active");
                recalculateVariantACMG(criteria);
            });
            
            acmgContainer.appendChild(box);
        });
        
        // Set initial label
        document.getElementById("vcf-detail-acmg").innerText = variant.acmg;
    }
    
    // Trigger protein model redraw
    drawProteinModel(variant);
}

function recalculateVariantACMG(criteria) {
    const activeCodes = criteria.filter(c => c.active).map(c => c.code);
    let finalClass = "VUS (Variant of Uncertain Significance)";
    
    if (activeCodes.includes("PVS1") && activeCodes.includes("PM2")) {
        finalClass = "Pathogenic (PVS1 + PM2)";
    } else if (activeCodes.includes("PS1") && activeCodes.includes("PM2") && activeCodes.includes("PP3")) {
        finalClass = "Pathogenic (PS1 + PM2 + PP3)";
    } else if (activeCodes.includes("PM2") && activeCodes.includes("PP3") && activeCodes.includes("PP4")) {
        finalClass = "Likely Pathogenic (PM2 + PP3 + PP4)";
    } else if (activeCodes.includes("PM2") && activeCodes.includes("PP3")) {
        finalClass = "Likely Pathogenic (PM2 + PP3)";
    } else if (activeCodes.length === 0) {
        finalClass = "Benign / Likely Benign";
    }
    
    document.getElementById("vcf-detail-acmg").innerText = finalClass;
    
    // Update badge in VCF table temporarily
    const selectedRow = document.querySelector(".vcf-row.selected td .badge");
    if (selectedRow) {
        selectedRow.innerText = finalClass.split(" ")[0];
        selectedRow.className = `badge ${finalClass.includes('Pathogenic') ? 'badge-red' : 'badge-orange'}`;
    }
}

// --- Canvas 3D Molecular Wireframe Simulator ---
let animationFrameId = null;
let rotationAngle = 0;

function drawProteinModel(variant) {
    const canvas = document.getElementById("protein-canvas");
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    
    // Update structural label overlay
    document.getElementById("protein-meta-label").innerText = `Model: ${variant.gene}_monomer.pdb`;
    document.getElementById("protein-residue-label").innerText = `Mutant site: p.${variant.mutation.split("p.")[1].replace(")", "")}`;
}

function startProteinAnimation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    const canvas = document.getElementById("protein-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    function animate() {
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);
        
        // Draw spinning protein backbone
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate(rotationAngle);
        
        // Generate pseudo-3D backbone points representing alpha helices
        const points = [];
        const numPoints = 80;
        
        for (let i = 0; i < numPoints; i++) {
            const theta = (i * 0.4);
            const r = 45 + Math.sin(i * 0.1) * 20;
            const x = Math.cos(theta) * r;
            const y = (i - numPoints/2) * 2.5 + Math.cos(i * 0.3) * 10;
            const z = Math.sin(theta) * r;
            
            // Project 3D to 2D
            const scale = 200 / (200 + z);
            points.push({
                x: x * scale,
                y: y * scale,
                z: z,
                scale: scale
            });
        }
        
        // Draw backbone ribbon
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(142, 36, 170, 0.4)";
        for (let i = 0; i < points.length; i++) {
            if (i === 0) ctx.moveTo(points[i].x, points[i].y);
            else ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        
        // Draw secondary alpha helices cylinders
        ctx.strokeStyle = "rgba(0, 229, 255, 0.6)";
        ctx.lineWidth = 1.5;
        for (let i = 10; i < points.length - 10; i += 2) {
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[i+1].x, points[i+1].y);
            ctx.stroke();
        }
        
        // Highlight active mutation spot (let's pick index 35 as mutant site)
        const mutIndex = 35;
        const mutPoint = points[mutIndex];
        
        // Draw pulsing halo around mutant point
        const pulse = 10 + Math.sin(Date.now() * 0.008) * 4;
        ctx.beginPath();
        ctx.arc(mutPoint.x, mutPoint.y, pulse, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 23, 68, 0.15)";
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255, 23, 68, 0.7)";
        ctx.stroke();
        
        // Draw central solid mutation sphere
        ctx.beginPath();
        ctx.arc(mutPoint.x, mutPoint.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "var(--accent-red)";
        ctx.fill();
        
        // Draw side chain ligand connection line to mutant site
        ctx.beginPath();
        ctx.moveTo(mutPoint.x, mutPoint.y);
        ctx.lineTo(mutPoint.x + 25, mutPoint.y - 30);
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw tiny text label for mutant site
        ctx.fillStyle = "#fff";
        ctx.font = "bold 9px monospace";
        ctx.fillText("MUTANT SITE", mutPoint.x + 30, mutPoint.y - 26);
        
        ctx.restore();
        
        rotationAngle += 0.005;
        animationFrameId = requestAnimationFrame(animate);
    }
    
    animate();
}

// --- Analytics / Intelligence Portal ---
function initAnalyticsDashboard() {
    // Generate simulated API credentials
    generateMockApiKey();
}

function animateCohortBars() {
    const bars = document.querySelectorAll(".chart-bar");
    bars.forEach(bar => {
        const heightVal = bar.getAttribute("data-height");
        bar.style.height = "0px";
        setTimeout(() => {
            bar.style.height = `${heightVal}%`;
        }, 150);
    });
}

function runCohortQuery() {
    const gene = document.getElementById("cohort-gene-filter").value.trim().toUpperCase();
    const phenoText = document.getElementById("cohort-pheno-filter").value.toLowerCase();
    
    const resultsPanel = document.getElementById("cohort-query-results");
    resultsPanel.innerHTML = `
        <div style="text-align:center; padding:20px; color:var(--accent-cyan);">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p style="margin-top:10px; font-size:12px;">Querying federated rare disease datalakes...</p>
        </div>
    `;
    
    setTimeout(() => {
        // Calculate dynamic mock cohort sizes based on inputs
        let baseCount = 142;
        if (gene) baseCount = Math.floor(Math.random() * 20) + 5;
        if (phenoText.includes("seiz") || phenoText.includes("epil")) baseCount = Math.round(baseCount * 0.8);
        if (phenoText.includes("hypot")) baseCount = Math.round(baseCount * 0.5);
        
        resultsPanel.innerHTML = `
            <div style="background:rgba(0, 229, 255, 0.05); border: 1px solid rgba(0, 229, 255, 0.2); border-radius:8px; padding:12px; margin-bottom:12px;">
                <h5 style="font-size:13px; color:#fff; font-weight:600; margin-bottom:4px;">
                    <i class="fas fa-check-circle" style="color:var(--accent-green);"></i> Query Compiled Successfully
                </h5>
                <p style="font-size:11px; color:var(--text-secondary);">
                    SQL/FHIR output matched <strong>${baseCount} patients</strong> globally.
                </p>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-secondary);">
                    <span>Cohort Size:</span>
                    <strong style="color:var(--accent-cyan);">${baseCount} Cases</strong>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-secondary);">
                    <span>Consented for Research:</span>
                    <strong style="color:var(--accent-green);">${Math.round(baseCount * 0.82)} Patients</strong>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-secondary);">
                    <span>Active WGS sequenced:</span>
                    <strong style="color:var(--accent-purple);">${Math.round(baseCount * 0.95)} Cases</strong>
                </div>
            </div>
            <button class="btn btn-primary" style="width:100%; font-size:11px; padding:6px 12px; margin-top:12px;">
                <i class="fas fa-download"></i> Export De-identified Dataset (CSV)
            </button>
        `;
        
        // Update charts to reflect query change
        document.getElementById("cohort-chart-title").innerText = `Phenotypic Spectrum (${gene || 'All Cases'})`;
        const bars = document.querySelectorAll(".chart-bar");
        bars.forEach(bar => {
            const randomHeight = Math.floor(Math.random() * 70) + 15;
            bar.setAttribute("data-height", randomHeight);
            bar.setAttribute("data-val", `${Math.round(baseCount * (randomHeight/100))}`);
        });
        animateCohortBars();
    }, 1000);
}

function generateMockApiKey() {
    const keyInput = document.getElementById("api-key-value");
    if (!keyInput) return;
    
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let key = "lm_live_";
    for (let i = 0; i < 32; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    keyInput.value = key;
}

// Canvas-based World Map simulation showing dots for disease hotspots
let mapAnimationId = null;
function startEpidemiologyMapAnimation() {
    const canvas = document.getElementById("map-canvas");
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    
    // Static dot coordinates simulating continental outlines
    const mapDots = [];
    const rows = 25;
    const cols = 50;
    
    // Quick world map coordinates generation
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            // Hardcoded basic landmass rules to draw an abstract map of the world
            let isLand = false;
            // North America
            if (r > 3 && r < 11 && c > 5 && c < 15) isLand = true;
            // South America
            if (r >= 11 && r < 22 && c > 10 && c < 17 && c > 10 + (r-11)*0.4) isLand = true;
            // Europe
            if (r > 4 && r < 10 && c >= 20 && c < 28) isLand = true;
            // Africa
            if (r >= 10 && r < 20 && c >= 21 && c < 29 && c > 21 + (r-10)*0.2) isLand = true;
            // Asia
            if (r > 3 && r < 13 && c >= 28 && c < 45) isLand = true;
            // Australia
            if (r > 16 && r < 21 && c > 40 && c < 46) isLand = true;
            
            if (isLand) {
                mapDots.push({
                    x: (c / cols) * width,
                    y: (r / rows) * height
                });
            }
        }
    }
    
    // Highlight points (active rare disease cases reported)
    const hotSpots = [
        { x: 0.22 * width, y: 0.3 * height, r: 8, color: "var(--accent-red)", name: "Boston Medical" },
        { x: 0.52 * width, y: 0.25 * height, r: 6, color: "var(--accent-cyan)", name: "Paris Gen" },
        { x: 0.72 * width, y: 0.42 * height, r: 10, color: "var(--accent-purple)", name: "New Delhi Clinic" },
        { x: 0.31 * width, y: 0.65 * height, r: 5, color: "var(--accent-orange)", name: "São Paulo Health" }
    ];
    
    if (mapAnimationId) {
        cancelAnimationFrame(mapAnimationId);
    }
    
    function drawMap() {
        ctx.clearRect(0, 0, width, height);
        
        // Draw grid lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 30) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
        }
        for (let y = 0; y < height; y += 30) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
        }
        
        // Draw World Dots
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        mapDots.forEach(dot => {
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, 1.5, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Draw Hotspots with pulsing ring effect
        const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.5;
        hotSpots.forEach(spot => {
            // Pulse Ring
            ctx.beginPath();
            ctx.arc(spot.x, spot.y, spot.r * pulse, 0, Math.PI * 2);
            ctx.strokeStyle = spot.color;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // Solid center
            ctx.beginPath();
            ctx.arc(spot.x, spot.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = spot.color;
            ctx.fill();
            
            // Tiny label
            ctx.fillStyle = "var(--text-secondary)";
            ctx.font = "9px Inter";
            ctx.fillText(spot.name, spot.x + 8, spot.y + 3);
        });
        
        mapAnimationId = requestAnimationFrame(drawMap);
    }
    
    drawMap();
}
