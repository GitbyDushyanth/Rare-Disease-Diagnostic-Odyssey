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
