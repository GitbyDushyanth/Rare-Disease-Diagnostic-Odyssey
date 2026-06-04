import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding LUMEN database...\n');

  // ── Organizations ─────────────────────────────────────────────────────────
  const hospital = await prisma.organization.upsert({
    where: { id: 'org-stanford-001' },
    update: {},
    create: {
      id: 'org-stanford-001',
      name: 'Stanford Medical Center',
      type: 'hospital',
      country: 'USA',
      city: 'Palo Alto',
      status: 'active',
      website: 'https://stanfordhealthcare.org',
    },
  });
  console.log(`✅ Organization: ${hospital.name}`);

  const labOrg = await prisma.organization.upsert({
    where: { id: 'org-genomelab-001' },
    update: {},
    create: {
      id: 'org-genomelab-001',
      name: 'LUMEN Genomics Lab',
      type: 'lab',
      country: 'USA',
      city: 'San Francisco',
      status: 'active',
    },
  });
  console.log(`✅ Organization: ${labOrg.name}`);

  // ── Admin User ────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lumen.health' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'admin@lumen.health',
      passwordHash: adminHash,
      fullName: 'LUMEN Admin',
      role: 'admin',
      status: 'active',
      profile: { create: { id: uuidv4(), institution: 'LUMEN Health', bio: 'Platform administrator' } },
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // ── Clinician User ────────────────────────────────────────────────────────
  const clinicianHash = await bcrypt.hash('Clinician@123', 12);
  const clinician = await prisma.user.upsert({
    where: { email: 'dr.patel@stanford.edu' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'dr.patel@stanford.edu',
      passwordHash: clinicianHash,
      fullName: 'Dr. Arjun Patel',
      role: 'clinician',
      status: 'active',
      profile: {
        create: {
          id: uuidv4(),
          specialty: 'Neurology',
          licenseNumber: 'CA-MED-49201',
          institution: 'Stanford Medical Center',
          yearsExperience: 12,
        },
      },
    },
  });
  console.log(`✅ Clinician: ${clinician.fullName}`);

  // ── Lab User ──────────────────────────────────────────────────────────────
  const labHash = await bcrypt.hash('Lab@123456', 12);
  const labUser = await prisma.user.upsert({
    where: { email: 'lab@lumen.health' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'lab@lumen.health',
      passwordHash: labHash,
      fullName: 'Dr. Meera Nair',
      role: 'lab',
      status: 'active',
      profile: {
        create: {
          id: uuidv4(),
          specialty: 'Clinical Genomics',
          licenseNumber: 'CA-GEN-00821',
          institution: 'LUMEN Genomics Lab',
        },
      },
    },
  });
  console.log(`✅ Lab user: ${labUser.fullName}`);

  // ── Researcher User ───────────────────────────────────────────────────────
  const researcherHash = await bcrypt.hash('Research@123', 12);
  const researcher = await prisma.user.upsert({
    where: { email: 'researcher@lumen.health' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'researcher@lumen.health',
      passwordHash: researcherHash,
      fullName: 'Dr. Sarah Kim',
      role: 'researcher',
      status: 'active',
      profile: { create: { id: uuidv4(), specialty: 'Rare Disease Genomics', institution: 'LUMEN Research' } },
    },
  });
  console.log(`✅ Researcher: ${researcher.fullName}`);

  // ── Patient User ──────────────────────────────────────────────────────────
  const patientHash = await bcrypt.hash('Patient@123', 12);
  const patientUser = await prisma.user.upsert({
    where: { email: 'sarah.johnson@example.com' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'sarah.johnson@example.com',
      passwordHash: patientHash,
      fullName: 'Sarah Johnson',
      role: 'patient',
      gender: 'female',
      country: 'United States',
      status: 'active',
      profile: { create: { id: uuidv4() } },
    },
  });
  console.log(`✅ Patient user: ${patientUser.fullName}`);

  // ── Patient Record ────────────────────────────────────────────────────────
  const patient = await prisma.patient.upsert({
    where: { userId: patientUser.id },
    update: {},
    create: {
      id: uuidv4(),
      userId: patientUser.id,
      organizationId: hospital.id,
      mrn: 'MRN-20240001',
      dateOfBirth: new Date('2012-04-15'),
      heightCm: 148,
      weightKg: 42,
      primaryLanguage: 'en',
      lifeStatus: 'alive',
    },
  });
  console.log(`✅ Patient record: MRN ${patient.mrn}`);

  // ── Conditions ────────────────────────────────────────────────────────────
  for (const c of [
    { icdCode: 'G71.0', name: 'Muscular Dystrophy - Suspected', status: 'active' },
    { icdCode: 'R53.83', name: 'Fatigue', status: 'active' },
  ]) {
    await prisma.condition.create({ data: { id: uuidv4(), patientId: patient.id, ...c } });
  }
  console.log(`✅ Conditions seeded`);

  // ── Symptom Entries ───────────────────────────────────────────────────────
  for (const s of [
    { date: new Date('2024-05-30'), pain: 2, fatigue: 4, mobility: 6, sleep: 5, mood: 7, notes: 'Difficulty climbing stairs. Fatigue after short walks.' },
    { date: new Date('2024-06-02'), pain: 3, fatigue: 5, mobility: 5, sleep: 4, mood: 8, notes: 'Muscle weakness in legs. Gowers maneuver noted.' },
    { date: new Date('2024-06-05'), pain: 4, fatigue: 6, mobility: 4, sleep: 5, mood: 6, notes: 'Increased fatigue. Calf muscles appear enlarged.' },
  ]) {
    await prisma.symptomEntry.create({ data: { id: uuidv4(), patientId: patient.id, ...s } });
  }
  console.log(`✅ Symptom entries seeded`);

  // ── Diagnostic Suggestions ────────────────────────────────────────────────
  for (const d of [
    { diseaseName: 'Duchenne Muscular Dystrophy', diseaseId: 'OMIM:310200', confidenceScore: 0.89, rank: 1, explanation: 'Strong phenotypic match: proximal muscle weakness + elevated CK + childhood onset.' },
    { diseaseName: 'Becker Muscular Dystrophy', diseaseId: 'OMIM:300376', confidenceScore: 0.71, rank: 2, explanation: 'Similar phenotype but milder progression. Allelic to DMD.' },
    { diseaseName: 'Limb-Girdle Muscular Dystrophy', diseaseId: 'OMIM:253600', confidenceScore: 0.44, rank: 3, explanation: 'Proximal weakness pattern consistent but autosomal, less likely given X-linked hint.' },
  ]) {
    await prisma.diagnosticSuggestion.create({ data: { id: uuidv4(), patientId: patient.id, ...d } });
  }
  console.log(`✅ Diagnostic suggestions seeded`);

  // ── Genomic Sample ────────────────────────────────────────────────────────
  const sample = await prisma.genomicSample.create({
    data: {
      id: uuidv4(),
      patientId: patient.id,
      organizationId: labOrg.id,
      sampleType: 'blood',
      platform: 'WES',
      genomeRef: 'GRCh38',
      status: 'completed',
      coverageDepth: 120.5,
      readCount: 45231000,
      receivedDate: new Date('2024-05-20'),
      runDate: new Date('2024-05-25'),
    },
  });

  const run = await prisma.sequencingRun.create({
    data: {
      id: uuidv4(),
      sampleId: sample.id,
      runDate: new Date('2024-05-25'),
      platform: 'WES',
      readCount: 45231000,
      coverageX: 120.5,
      status: 'completed',
      vcfUrl: '/uploads/genomics/sample_SJ.vcf',
    },
  });

  // ── Variants ──────────────────────────────────────────────────────────────
  const variantsData = [
    { gene: 'DMD', variant: 'c.5899dupC', acmg: 'pathogenic', confidence: 0.94, gnomad: 0.00001, omim: '310200', chromosome: 'X', position: 31775038, zygosity: 'hemizygous' },
    { gene: 'DMD', variant: 'c.123+2T>G', acmg: 'likely_pathogenic', confidence: 0.78, gnomad: 0.00005, omim: '300376', chromosome: 'X', position: 31496977, zygosity: 'hemizygous' },
    { gene: 'TTN', variant: 'c.10425A>G', acmg: 'vus', confidence: 0.45, gnomad: 0.0012, omim: '188840', chromosome: '2', position: 178712145, zygosity: 'heterozygous' },
    { gene: 'RYR1', variant: 'c.7321G>A', acmg: 'vus', confidence: 0.32, gnomad: 0.0031, omim: '180901', chromosome: '19', position: 38924811, zygosity: 'heterozygous' },
  ];

  for (const v of variantsData) {
    const variant = await prisma.variant.create({
      data: {
        id: uuidv4(),
        sampleId: sample.id,
        runId: run.id,
        chromosome: v.chromosome,
        position: v.position,
        refAllele: 'REF',
        altAllele: 'ALT',
        geneSymbol: v.gene,
        zygosity: v.zygosity,
        qualityScore: v.confidence * 100,
      },
    });

    await prisma.variantAnnotation.create({
      data: {
        id: uuidv4(),
        variantId: variant.id,
        gnomadFrequency: v.gnomad,
        omimId: v.omim,
        pathogenicity: v.acmg,
      },
    });

    await prisma.variantInterpretation.create({
      data: {
        id: uuidv4(),
        variantId: variant.id,
        interpretedBy: 'AI-LUMEN-v1',
        acmgClassification: v.acmg,
        confidenceScore: v.confidence,
        reviewStatus: 'pending',
      },
    });
  }
  console.log(`✅ Genomic sample + ${variantsData.length} variants seeded`);

  // ── Case ──────────────────────────────────────────────────────────────────
  const caseRecord = await prisma.case.create({
    data: {
      id: uuidv4(),
      patientId: patient.id,
      title: 'Suspected DMD — Comprehensive Workup',
      description: '12-year-old female with progressive proximal muscle weakness. Elevated CK. Family history unclear.',
      status: 'in_progress',
      priority: 'high',
      aiFlag: 'high',
      createdBy: clinician.id,
      assignedTo: clinician.id,
    },
  });
  console.log(`✅ Case created: ${caseRecord.title}`);

  // ── Clinical Trials ───────────────────────────────────────────────────────
  const trialsData = [
    { nctId: 'NCT04680585', title: 'EMBARK: A Global Phase 3 Study of Delandistrogene Moxeparvovec (SRP-9001)', phase: 'Phase 3', sponsor: 'Sarepta Therapeutics', status: 'Recruiting', conditions: JSON.stringify(['Duchenne Muscular Dystrophy']), locations: JSON.stringify(['Boston, MA', 'London, UK', 'Sydney, AU']), targetEnroll: 120, contactEmail: 'trials@sarepta.com' },
    { nctId: 'NCT05120115', title: 'Givinostat in Duchenne Muscular Dystrophy', phase: 'Phase 3', sponsor: 'Italfarmaco', status: 'Recruiting', conditions: JSON.stringify(['Duchenne Muscular Dystrophy']), locations: JSON.stringify(['Milan, IT', 'New York, NY', 'Toronto, CA']), targetEnroll: 230 },
    { nctId: 'NCT04281409', title: "Gene Therapy for LGMD R1 (Calpain 3 Deficiency)", phase: 'Phase 2', sponsor: "Nationwide Children's Hospital", status: 'Recruiting', conditions: JSON.stringify(['Limb-Girdle Muscular Dystrophy']), locations: JSON.stringify(['Columbus, OH', 'Hamburg, DE']) },
  ];
  for (const t of trialsData) {
    const exists = await prisma.clinicalTrial.findUnique({ where: { nctId: t.nctId } });
    if (!exists) await prisma.clinicalTrial.create({ data: { id: uuidv4(), ...t } });
  }
  console.log(`✅ Clinical trials seeded`);

  // ── Notifications ─────────────────────────────────────────────────────────
  for (const n of [
    { userId: patientUser.id, type: 'diagnostic', title: 'AI Analysis Complete', message: 'Your symptom data has been analyzed. Potential Duchenne Muscular Dystrophy detected with 89% confidence. Speak with your doctor.', isRead: false },
    { userId: patientUser.id, type: 'trial', title: 'Clinical Trial Match Found', message: 'You may be eligible for 3 clinical trials. Tap to view details.', isRead: false },
    { userId: clinician.id, type: 'alert', title: 'New Case Assigned', message: 'Case CASE-2024-001 has been assigned to you: Suspected DMD workup.', isRead: false },
  ]) {
    await prisma.notification.create({ data: { id: uuidv4(), ...n } });
  }
  console.log(`✅ Notifications seeded`);

  // ── System Settings ───────────────────────────────────────────────────────
  for (const s of [
    { key: 'platform.name', value: 'LUMEN', description: 'Platform display name', isPublic: true },
    { key: 'platform.version', value: '1.0.0', description: 'Current platform version', isPublic: true },
    { key: 'ai.hpo.minConfidence', value: '0.5', description: 'Minimum HPO confidence threshold' },
    { key: 'ai.disease.maxResults', value: '20', description: 'Maximum disease matches to return' },
    { key: 'audit.retentionYears', value: '7', description: 'HIPAA audit log retention years' },
  ]) {
    const exists = await prisma.systemSetting.findUnique({ where: { key: s.key } });
    if (!exists) await prisma.systemSetting.create({ data: { id: uuidv4(), ...s } });
  }
  console.log(`✅ System settings seeded`);

  console.log('\n✨ Database seeded successfully!\n');
  console.log('📋 Demo credentials:');
  console.log('   Admin:      admin@lumen.health       / Admin@123456');
  console.log('   Clinician:  dr.patel@stanford.edu    / Clinician@123');
  console.log('   Lab:        lab@lumen.health         / Lab@123456');
  console.log('   Researcher: researcher@lumen.health  / Research@123');
  console.log('   Patient:    sarah.johnson@example.com / Patient@123');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
