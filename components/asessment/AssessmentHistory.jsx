import { Calendar, Trophy, TrendingUp, Target, FileText } from "lucide-react";

export default function AssessmentHistory({ assessments = [], onRetake }) {
  
  // Helper to determine status based on score (Same logic as ResultStep)
  const getResultDetails = (score) => {
    if (score >= 31) return { 
      title: 'Freedom Achiever', 
      color: 'bg-green-500', 
      text: 'text-green-600',
      icon: Trophy 
    };
    if (score >= 21) return { 
      title: 'Freedom Explorer', 
      color: 'bg-blue-600', 
      text: 'text-blue-600',
      icon: TrendingUp 
    };
    return { 
      title: 'Freedom Seeker', 
      color: 'bg-orange-500', 
      text: 'text-orange-500',
      icon: Target 
    };
  };

  // Helper to format date like "December 10th, 2025"
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  // Helper to capitalize profile type (e.g., 'retired' -> 'Retired')
  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <FileText className="text-gray-800" size={24} />
        <h2 className="text-2xl font-bold text-gray-900">Assessment History</h2>
        <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
          {assessments.length} Assessments
        </span>
      </div>

      {/* List */}
      <div className="space-y-4">
        {assessments.map((item, index) => {
          const { title, color, icon: Icon } = getResultDetails(item.score);
          
          return (
            <div 
              key={item.id || index} 
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow"
            >
              {/* Left Side: Icon + Details */}
              <div className="flex items-start md:items-center gap-5">
                {/* Circular Icon */}
                <div className={`w-14 h-14 rounded-full ${color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                  <Icon className="text-white" size={28} />
                </div>

                {/* Text Details */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{title}</h3>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                    <Calendar size={14} />
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">
                    Profile Type: <span className="text-gray-900 font-bold">{capitalize(item.profile_type)}</span>
                  </p>
                </div>
              </div>

              {/* Right Side: Score + Badge */}
              <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 border-t md:border-t-0 border-gray-100 pt-4 md:pt-0">
                <div className="text-3xl font-extrabold text-gray-900">
                  {item.score}<span className="text-gray-400 text-xl font-medium">/40</span>
                </div>
                <div className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full border border-gray-200">
                  {capitalize(item.profile_type)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer CTA Card */}
      <div className="mt-8 bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
        <div className="w-12 h-12 mx-auto mb-4 text-gray-800">
            <Trophy size={48} strokeWidth={1.5} />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Ready for Another Assessment?</h3>
        <p className="text-gray-500 mb-6">Track your progress over time by taking regular assessments</p>
        
        <button 
          onClick={onRetake}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-colors"
        >
          Take New Assessment
        </button>
      </div>

    </div>
  );
}