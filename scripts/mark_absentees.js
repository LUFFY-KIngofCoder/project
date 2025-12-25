#!/usr/bin/env node
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing environment variables. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const base = SUPABASE_URL.replace(/\/+$/, '');

const today = new Date();
const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
  today.getDate(),
).padStart(2, '0')}`;

async function fetchActiveEmployees() {
  const url = `${base}/rest/v1/profiles?role=eq.employee&is_active=eq.true`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch profiles: ${res.status} ${await res.text()}`);
  return res.json();
}

async function fetchTodayAttendance() {
  const url = `${base}/rest/v1/attendance?date=eq.${dateStr}&select=employee_id`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch attendance: ${res.status} ${await res.text()}`);
  return res.json();
}

async function insertAbsentees(rows) {
  if (rows.length === 0) return { inserted: 0 };
  const url = `${base}/rest/v1/attendance`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(rows),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Failed to insert attendance: ${res.status} ${JSON.stringify(data)}`);
  return { inserted: Array.isArray(data) ? data.length : 1, data };
}

(async () => {
  try {
    console.log(`Marking absentees for date ${dateStr}...`);

    const [profiles, attendance] = await Promise.all([fetchActiveEmployees(), fetchTodayAttendance()]);

    const presentIds = new Set((attendance || []).map((r) => r.employee_id));
    const toInsert = (profiles || [])
      .filter((p) => !presentIds.has(p.id))
      .map((p) => ({
        employee_id: p.id,
        date: dateStr,
        status: 'absent',
        work_mode: null,
        reason: 'Auto-marked absent',
        check_in_time: null,
        check_out_time: null,
        is_approved: true,
        approved_by: null,
        approved_at: new Date().toISOString(),
      }));

    if (toInsert.length === 0) {
      console.log('No missing attendance records — nothing to do.');
      process.exit(0);
    }

    const result = await insertAbsentees(toInsert);
    console.log(`Inserted ${result.inserted} absent records.`);
  } catch (err) {
    console.error('Error marking absentees:', err);
    process.exit(1);
  }
})();
