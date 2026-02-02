"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  User, Shield, Database, Cloud, 
  ExternalLink, CheckCircle2, Lock, 
  Camera, Loader2, Globe 
} from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // State for Admin User
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState({ full_name: "", avatar_url: "" });

  useEffect(() => {
    async function loadAdminData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (prof) setProfile({ full_name: prof.full_name || "", avatar_url: prof.avatar_url || "" });
      }
      setLoading(false);
    }
    loadAdminData();
  }, []);

  const handleUpdateProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update(profile)
      .eq("id", user.id);
    
    setSaving(false);
    if (error) toast.error("Failed to update profile");
    else toast.success("Profile updated successfully");
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-2 duration-700">
      
      {/* Header */}
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight">System Settings</h1>
        <p className="text-zinc-500 mt-2">Manage your administrative identity and miracle-fm infrastructure.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* LEFT COLUMN: Infrastructure Status */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-6">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-blue-500">
              <Cloud size={16} /> Infrastructure
            </h2>
            
            {/* Cloudflare R2 Status */}
            <div className="space-y-4">
              <div className="p-4 bg-black rounded-2xl border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500"><Database size={18} /></div>
                  <div>
                    <p className="text-sm font-bold">Cloudflare R2</p>
                    <p className="text-[10px] text-green-500 flex items-center gap-1">
                      <CheckCircle2 size={10} /> Connected
                    </p>
                  </div>
                </div>
                <Globe size={16} className="text-zinc-700" />
              </div>

              <div className="p-4 bg-black rounded-2xl border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><Shield size={18} /></div>
                  <div>
                    <p className="text-sm font-bold">Supabase Auth</p>
                    <p className="text-[10px] text-green-500 flex items-center gap-1">
                      <CheckCircle2 size={10} /> Encrypted
                    </p>
                  </div>
                </div>
                <Lock size={16} className="text-zinc-700" />
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter mb-2">Public CDN Endpoint</p>
              <div className="bg-black p-3 rounded-xl border border-zinc-800 flex items-center justify-between group">
                <span className="text-xs text-zinc-400 truncate mr-2">{process.env.NEXT_PUBLIC_R2_PUBLIC_URL}</span>
                <ExternalLink size={14} className="text-zinc-600 group-hover:text-blue-500 transition cursor-pointer" />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Profile & Security */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Profile Section */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 space-y-8">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-blue-500">
              <User size={16} /> Admin Profile
            </h2>

            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="relative group">
                <div className="w-32 h-32 bg-zinc-800 rounded-3xl border-2 border-dashed border-zinc-700 flex items-center justify-center overflow-hidden">
                   {profile.avatar_url ? (
                     <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                   ) : (
                     <User size={40} className="text-zinc-600" />
                   )}
                </div>
                <button className="absolute -bottom-2 -right-2 bg-blue-600 p-2 rounded-xl shadow-xl hover:scale-110 transition">
                  <Camera size={16} />
                </button>
              </div>

              <div className="flex-1 w-full space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Display Name</label>
                    <input 
                      value={profile.full_name}
                      onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                      className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
                      placeholder="Admin Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Email (Read Only)</label>
                    <input 
                      value={user?.email} 
                      disabled
                      className="w-full bg-zinc-800/30 border border-zinc-800 text-zinc-500 rounded-xl px-4 py-3 cursor-not-allowed"
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={handleUpdateProfile} 
                  disabled={saving}
                  className="bg-white text-black hover:bg-zinc-200 rounded-full font-bold px-8"
                >
                  {saving && <Loader2 className="animate-spin mr-2" size={16} />}
                  Update Profile
                </Button>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
                <Shield size={24} />
              </div>
              <div>
                <h3 className="font-bold">Account Password</h3>
                <p className="text-sm text-zinc-500">Reset your administrative password regularly.</p>
              </div>
            </div>
            <Button className="bg-transparent border border-zinc-800 hover:bg-zinc-800 text-white rounded-full font-bold transition-all px-6">
                Change Password
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}