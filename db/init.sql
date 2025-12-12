-- Database initialization SQL for Attendance & Worklog app
-- Creates departments, profiles, attendance, worklogs tables
-- Run in Supabase SQL editor or via psql

-- Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Profiles (linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  full_name text,
  role text DEFAULT 'employee',
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Attendance
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL,
  reason text,
  approved boolean DEFAULT false,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON public.attendance (employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance (date);

-- Worklogs
CREATE TABLE IF NOT EXISTS public.worklogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  hours numeric DEFAULT 0,
  tasks text,
  is_approved boolean DEFAULT false,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_worklogs_employee ON public.worklogs (employee_id);
CREATE INDEX IF NOT EXISTS idx_worklogs_date ON public.worklogs (date);

-- Note: Supabase authentication users are stored in the `auth` schema. Create
-- authentication users via Supabase Dashboard, the Admin API, or the
-- `supabase` CLI. After creating auth users, insert corresponding rows into
-- `public.profiles` with the user's `id` returned from the Auth creation.
