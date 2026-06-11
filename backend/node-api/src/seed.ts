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

  const demoPatientHash = await bcrypt.hash('Patient@123', 12);
  const demoPatientUser = await prisma.user.upsert({
    where: { email: 'demo.patient@lumen.health' },
    update: {
      fullName: 'Aarav Mehta',
      role: 'patient',
      status: 'active',
      dateOfBirth: new Date('2014-05-18'),
      gender: 'male',
      country: 'United States',
    },
    create: {
      id: uuidv4(),
      email: 'demo.patient@lumen.health',
      passwordHash: demoPatientHash,
      fullName: 'Aarav Mehta',
      role: 'patient',
      status: 'active',
      dateOfBirth: new Date('2014-05-18'),
      gender: 'male',
      country: 'United States',
      profile: { create: { id: uuidv4(), bio: 'Demo patient for AI diagnostic workflow' } },
    },
  });

  const demoPatient = await prisma.patient.upsert({
    where: { userId: demoPatientUser.id },
    update: {
      organizationId: hospital.id,
      dateOfBirth: new Date('2014-05-18'),
      heightCm: 139,
      weightKg: 34,
    },
    create: {
      id: uuidv4(),
      userId: demoPatientUser.id,
      organizationId: hospital.id,
      mrn: 'MRN-DEMO-RARE-001',
      dateOfBirth: new Date('2014-05-18'),
      heightCm: 139,
      weightKg: 34,
    },
  });

  const demoCondition = await prisma.condition.findFirst({
    where: { patientId: demoPatient.id, name: 'Progressive proximal muscle weakness' },
  });
  if (!demoCondition) {
    await prisma.condition.create({
      data: {
        id: uuidv4(),
        patientId: demoPatient.id,
        icdCode: 'R53.1',
        name: 'Progressive proximal muscle weakness',
        status: 'active',
        onsetDate: new Date('2024-02-01'),
        notes: 'Difficulty climbing stairs, frequent falls, elevated fatigue after activity.',
      },
    });
  }

  const hpoTerms = [
    { id: 'HP:0001324', name: 'Muscle weakness', confidence: 0.92, evidence_text: 'progressive proximal weakness' },
    { id: 'HP:0003701', name: 'Proximal muscle weakness', confidence: 0.88, evidence_text: 'difficulty climbing stairs' },
    { id: 'HP:0003236', name: 'Elevated circulating creatine kinase concentration', confidence: 0.76, evidence_text: 'elevated CK' },
  ];

  const existingSymptom = await prisma.symptomEntry.findFirst({
    where: { patientId: demoPatient.id, notes: { contains: 'progressive proximal weakness' } },
  });
  if (!existingSymptom) {
    await prisma.symptomEntry.create({
      data: {
        id: uuidv4(),
        patientId: demoPatient.id,
        pain: 3,
        fatigue: 8,
        mobility: 6,
        sleep: 4,
        mood: 5,
        notes: 'Patient has progressive proximal weakness, difficulty climbing stairs, frequent falls, fatigue, and elevated CK.',
        hpoTerms: JSON.stringify(hpoTerms),
        source: 'clinician',
      },
    });
  }

  await prisma.diagnosticSuggestion.deleteMany({ where: { patientId: demoPatient.id } });
  await prisma.diagnosticSuggestion.createMany({
    data: [
      {
        id: uuidv4(),
        patientId: demoPatient.id,
        diseaseName: 'Duchenne Muscular Dystrophy',
        diseaseId: 'OMIM:310200',
        confidenceScore: 0.89,
        rank: 1,
        hpoOverlap: JSON.stringify(['HP:0001324', 'HP:0003701', 'HP:0003236']),
        explanation: 'Seeded AI demo match for neuromuscular phenotype with elevated CK.',
      },
      {
        id: uuidv4(),
        patientId: demoPatient.id,
        diseaseName: 'Spinal Muscular Atrophy',
        diseaseId: 'OMIM:608807',
        confidenceScore: 0.72,
        rank: 2,
        hpoOverlap: JSON.stringify(['HP:0001324', 'HP:0003701']),
        explanation: 'Seeded AI demo differential with overlapping motor weakness findings.',
      },
    ],
  });

  const existingCase = await prisma.case.findFirst({
    where: { patientId: demoPatient.id, title: 'AI rare disease workup - neuromuscular phenotype' },
  });
  if (!existingCase) {
    const demoCase = await prisma.case.create({
      data: {
        id: uuidv4(),
        patientId: demoPatient.id,
        title: 'AI rare disease workup - neuromuscular phenotype',
        description: 'Progressive proximal weakness, difficulty climbing stairs, frequent falls, fatigue, and elevated CK. Run AI to refresh HPO extraction and differential ranking.',
        priority: 'urgent',
        aiFlag: 'high',
        createdBy: clinician.id,
        status: 'open',
        participants: {
          create: { id: uuidv4(), userId: clinician.id, role: 'owner' },
        },
      },
    });
    await prisma.caseMessage.create({
      data: {
        id: uuidv4(),
        caseId: demoCase.id,
        senderId: clinician.id,
        type: 'ai_suggestion',
        message: 'AI demo initialized with HPO-backed neuromuscular differential diagnosis.',
      },
    });
  }
  console.log(`✅ Demo AI case: ${demoPatientUser.fullName}`);

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
    { userId: clinician.id, type: 'alert', title: 'Welcome to LUMEN', message: 'Your clinical portal is ready. Begin by adding a new patient.', isRead: false },
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
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
