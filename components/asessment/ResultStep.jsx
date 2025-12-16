import { RESULTS } from "./data";
import { RefreshCcw, Clock, TrendingUp, Shield, Heart } from "lucide-react";

export default function ResultStep({ score, onRetake }) {
  let resultType = "seeker";
  if (score >= 21 && score <= 30) resultType = "explorer";
  if (score >= 31) resultType = "achiever";

  const result = RESULTS[resultType];

  return (
    <div className="w-full max-w-4xl mx-auto animate-in zoom-in-95 duration-500">
      
      {/* Result Header */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 text-center p-8 md:p-12 relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-red-500"></div>
        
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
           <TrendingUp className="text-green-600" size={40} />
        </div>

        <h2 className={`text-4xl font-extrabold mb-4 ${result.color}`}>
          {result.title}
        </h2>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
          {result.desc}
        </p>

        <div className="mt-8 inline-block bg-orange-50 px-6 py-2 rounded-full border border-orange-100 text-orange-800 text-sm font-semibold">
          Your Score: {score}/40
        </div>
      </div>

      {/* Value Propositions (Grid from video) */}
      <h3 className="text-center font-bold text-gray-800 text-xl mb-6 flex items-center justify-center gap-2">
        <span className="text-orange-500">Why Become a Financial Advisor?</span>
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex gap-4">
          <div className="bg-orange-100 p-3 rounded-lg h-fit"><Clock className="text-orange-600" size={24}/></div>
          <div>
            <h4 className="font-bold text-gray-800">Time Freedom</h4>
            <p className="text-sm text-gray-500 mt-1">Work on your own schedule and be your own boss.</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex gap-4">
          <div className="bg-orange-100 p-3 rounded-lg h-fit"><TrendingUp className="text-orange-600" size={24}/></div>
          <div>
            <h4 className="font-bold text-gray-800">Unlimited Income</h4>
            <p className="text-sm text-gray-500 mt-1">No salary cap – your earnings grow with your efforts.</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex gap-4">
          <div className="bg-orange-100 p-3 rounded-lg h-fit"><Shield className="text-orange-600" size={24}/></div>
          <div>
            <h4 className="font-bold text-gray-800">Respect & Recognition</h4>
            <p className="text-sm text-gray-500 mt-1">Build a respected career helping families secure their future.</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex gap-4">
          <div className="bg-orange-100 p-3 rounded-lg h-fit"><Heart className="text-orange-600" size={24}/></div>
          <div>
            <h4 className="font-bold text-gray-800">Meaningful Impact</h4>
            <p className="text-sm text-gray-500 mt-1">Transform lives by guiding people to financial freedom.</p>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-gray-50 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-gray-200">
        <div>
          <h4 className="text-lg font-bold text-gray-800">Ready to Start Your Freedom Journey?</h4>
          <p className="text-sm text-gray-500 mt-1 max-w-md">
            Join Digital Gyani's DG Saarthi program. We provide complete training, mentorship, and a system to build your career.
          </p>
        </div>
        <div className="flex gap-4">
          <button className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors">
            Talk to Our Team
          </button>
          <button 
            onClick={onRetake}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-6 rounded-lg border border-gray-300 transition-colors"
          >
            <RefreshCcw size={18} /> Retake
          </button>
        </div>
      </div>

    </div>
  );
}