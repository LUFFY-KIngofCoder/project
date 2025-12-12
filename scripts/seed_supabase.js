#!/usr/bin/env node
// Seed script: creates demo auth users via Supabase Admin API and inserts profiles
// Usage: set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment, then:
//   node scripts/seed_supabase.js

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing environment variables. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

async function createUser(email, password) {
  const res = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function insertProfile(userId, email, full_name, role = 'employee') {
  const res = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ id: userId, email, full_name, role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

(async () => {
  try {
    console.log('Creating admin user...');
    const admin = await createUser('admin@company.com', 'admin123');
    console.log('Admin created:', admin.id);
    await insertProfile(admin.id, 'admin@company.com', 'Admin User', 'admin');

    console.log('Creating employee user...');
    const emp = await createUser('employee@company.com', 'employee123');
    console.log('Employee created:', emp.id);
    await insertProfile(emp.id, 'employee@company.com', 'Demo Employee', 'employee');

    console.log('Seeding complete. Admin: admin@company.com / admin123  Employee: employee@company.com / employee123');
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
})();
