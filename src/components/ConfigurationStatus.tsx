import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

export const ConfigurationStatus = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  const isConfigured = supabaseUrl && 
    supabaseKey && 
    supabaseUrl !== "your_supabase_project_url" && 
    supabaseKey !== "your_supabase_anon_key";

  if (isConfigured) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm mb-4">
        <CheckCircle className="w-4 h-4" />
        <span>Database connection configured</span>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-yellow-800 font-semibold mb-2">Database Not Configured</h3>
          <p className="text-yellow-700 text-sm mb-3">
            Polls functionality requires a Supabase database connection. Please set up your Supabase project.
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              {supabaseUrl && supabaseUrl !== "your_supabase_project_url" ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span>Supabase URL: {supabaseUrl ? "Set" : "Missing"}</span>
            </div>
            <div className="flex items-center gap-2">
              {supabaseKey && supabaseKey !== "your_supabase_anon_key" ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span>Supabase API Key: {supabaseKey ? "Set" : "Missing"}</span>
            </div>
          </div>
          <div className="mt-3 text-sm text-blue-600">
            📖 See <code>SUPABASE_SETUP_GUIDE.md</code> for setup instructions
          </div>
        </div>
      </div>
    </div>
  );
};