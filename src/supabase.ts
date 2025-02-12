import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ykmyftqhrsitavyzkggq.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrbXlmdHFocnNpdGF2eXprZ2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzczOTM3NDIsImV4cCI6MjA1Mjk2OTc0Mn0.Aiv0UdbNRo_naK8Bvm0DXVbf0yPEUY5lNdoeqEv2fVA"

export const supabase = createClient(supabaseUrl, supabaseAnonKey);