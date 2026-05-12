import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bkljbfqvlepmmwwylfdv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrbGpiZnF2bGVwbW13d3lsZmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MTIzMjksImV4cCI6MjA5NDE4ODMyOX0.H9AI_tTC00T_Oidd9gKkwyNi08xLjSq9sqqo50TItsU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
