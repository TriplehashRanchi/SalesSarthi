import { Home, Armchair, TrendingUp, Briefcase, Building2 } from "lucide-react";
// ADJUST THIS PATH to where you actually saved data.js
import { PROFILES } from "./data"; 

// 1. Define the map of String -> Component
const icons = {
  Home: Home,
  Armchair: Armchair,
  TrendingUp: TrendingUp,
  Briefcase: Briefcase,
  Building2: Building2,
  
  Wallet: Briefcase,
  Building: Building2 
};

export default function ProfileStep({ onSelect }) {
  return (
    <div className="w-full max-w-5xl mx-auto animate-in slide-in-from-bottom-8 duration-700">
      
      {/* Header Section */}
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
          Choose Your Profile
        </h2>
        <p className="text-lg text-gray-500 font-medium">
          Select the profile that best describes you
        </p>
      </div>

      {/* Grid Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
        {PROFILES.map((profile) => {
          // 3. SAFE ICON LOOKUP
          // If the icon name doesn't exist in the map, fallback to 'Home' to prevent crash
          const Icon = icons[profile.icon] || Home; 

          return (
            <button
              key={profile.id}
              onClick={() => onSelect(profile.id)}
              className="group bg-white p-8 rounded-2xl shadow-sm border border-gray-100 
                         hover:border-orange-500 hover:shadow-xl hover:-translate-y-1 
                         transition-all duration-300 text-left w-full h-full flex flex-col items-start"
            >
              {/* Icon Container */}
              <div className="bg-orange-50 w-14 h-14 rounded-xl flex items-center justify-center mb-6 
                            group-hover:bg-orange-500 transition-colors duration-300">
                <Icon 
                  className="text-orange-600 group-hover:text-white transition-colors duration-300" 
                  size={28} 
                  strokeWidth={2}
                />
              </div>

              {/* Text Content */}
              <h3 className="font-bold text-xl text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                {profile.label}
              </h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">
                {profile.desc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}