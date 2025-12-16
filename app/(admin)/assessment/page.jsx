"use client";
import { useState } from "react";
import { getAuth } from "firebase/auth";
import WelcomeStep from "@/components/asessment/WelcomeStep";
import ProfileStep from "@/components/asessment/ProfileStep";
import QuizStep from "@/components/asessment/QuizStep";
import ResultStep from "@/components/asessment/ResultStep";
import AssessmentHistory from "../../../components/asessment/AssessmentHistory";
export default function AssessmentPage() {
  const [currentStep, setCurrentStep] = useState("welcome");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [finalScore, setFinalScore] = useState(0);
  const [finalAnswers, setFinalAnswers] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Set your backend URL here (local or production)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const handleStart = () => setCurrentStep("profile");

  const handleProfileSelect = (profileId) => {
    setSelectedProfile(profileId);
    setCurrentStep("quiz");
  };

  // --- API INTEGRATION ---
  const handleQuizComplete = async (score, answersArray) => {
    setFinalScore(score);
    setCurrentStep("loading");

    // Replace with real User ID from your Auth context/session
    const auth = getAuth();
    const user = auth.currentUser;
    const user_id = user ? user.uid : "anonymous_user";

    try {
      console.log("Sending Data to Backend:", { user_id, selectedProfile, score, answersArray });
      
      const response = await fetch(`${API_URL}/api/assessments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user_id,
          profile_type: selectedProfile,
          score: score,
          answers: answersArray, // Sends array [1, 2, 4...]
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Server Error:", data.message);
      } else {
        console.log("Success:", data);
      }

    } catch (err) {
      console.error("Network Request Failed:", err);
    }

    // Simulate analysis delay for UX
    setTimeout(() => {
      setCurrentStep("result");
    }, 1500);
  };

  const handleRetake = () => {
    setFinalScore(0);
    setSelectedProfile(null);
    setCurrentStep("welcome");
  };

  const handleShowHistory = async () => {

    const auth = getAuth();
    const user = auth.currentUser;
    const USER_ID = user ? user.uid : "anonymous_user";

    setCurrentStep("history");
    setLoadingHistory(true);
    try {
        const res = await fetch(`${API_URL}/api/assessments/${USER_ID}`);
        const data = await res.json();
        if(data.assessments) {
            setHistoryData(data.assessments);
        }
    } catch (error) {
        console.error("Failed to fetch history", error);
    } finally {
        setLoadingHistory(false);
    }
  };


  const isWelcome = currentStep === "welcome";

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-700 ${isWelcome ? "bg-transparent" : "bg-gray-50"}`}>
      
      {isWelcome && (
        <div className="fixed inset-0 -z-10 w-full h-full">
          <img src="/background.jpg" alt="Freedom Background" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/60 to-white/95"></div>
        </div>
      )}

      {/* HEADER: Show 'History' button unless we are already on history page */}
      <header className={`absolute top-0 right-0 p-6 z-50 ${isWelcome ? 'hidden' : 'block'}`}>
         {currentStep !== 'history' && (
             <button 
               onClick={handleShowHistory}
               className="text-sm font-bold text-gray-500 hover:text-orange-500 transition-colors bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200"
             >
               View History
             </button>
         )}
         {currentStep === 'history' && (
             <button 
               onClick={() => setCurrentStep('welcome')}
               className="text-sm font-bold text-gray-500 hover:text-orange-500 transition-colors bg-white px-4 mt-10 py-2 rounded-2xl shadow-sm border border-gray-200"
             >
               Back to Home
             </button>
         )}
      </header>

      {/* Main Content Area */}
      {/* Dynamic Padding: Full width for welcome, contained for others */}
      <main className={`flex-grow flex flex-col items-center justify-center w-full relative z-10 ${isWelcome ? "p-0" : "p-4 md:p-8"}`}>

        {currentStep === "welcome" && (
            <WelcomeStep onStart={handleStart} />
        )}

        {currentStep === "profile" && (
            <ProfileStep onSelect={handleProfileSelect} />
        )}

        {currentStep === "quiz" && (
            <QuizStep onComplete={handleQuizComplete} />
        )}

        {currentStep === "loading" && (
          <div className="flex flex-col items-center animate-pulse">
            <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-medium tracking-wide">Analyzing your freedom path...</p>
          </div>
        )}

        {currentStep === "result" && (
          <ResultStep 
            score={finalScore} 
            onRetake={handleRetake} 
          />
        )}

         {currentStep === "history" && (
            loadingHistory ? (
                <div className="text-gray-500">Loading history...</div>
            ) : (
                <AssessmentHistory
                    assessments={historyData} 
                    onRetake={handleRetake} 
                />
            )
        )}

      </main>

      {/* Footer */}
      {!isWelcome && (
        <footer className="relative z-10 py-6 text-center text-gray-400 text-xs">
            &copy; {new Date().getFullYear()} Digital Gyani. All rights reserved.
        </footer>
      )}
    </div>
  );
}