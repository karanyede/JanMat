import { useState, useRef, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { ChatMessage } from "../types";
import { Send, Bot, Loader2 } from "lucide-react";


const Chatbot = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      content:
        "Hello! I'm JanMat Assistant, your AI helper for government services and civic questions. How can I assist you today?",
      role: "assistant",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Gemini AI integration
  const getAIResponse = async (userMessage: string): Promise<string> => {
    try {
      const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

      if (!GEMINI_API_KEY) {
        console.warn("Gemini API key not configured");
        return "I'm sorry, but the AI service is not configured. Please check with the administrator.";
      }

      console.log("Making request to Gemini API...");
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are JanMat Assistant, an advanced AI helper for India's premier civic engagement platform. You are an expert on Indian governance, constitutional law, civic procedures, and government services.

CORE KNOWLEDGE BASE:

🏛️ CONSTITUTIONAL FRAMEWORK:
- Fundamental Rights: Right to Information (RTI), Right to Education, Freedom of Speech and Expression
- Directive Principles: Environmental protection, public health, social welfare
- Panchayati Raj: Village, Block, and District level governance
- Urban governance: Municipal corporations, councils, and ward committees
- Emergency provisions and citizen responsibilities

🏢 GOVERNMENT SERVICES & PROCEDURES:
- Documents: Aadhaar, PAN, Voter ID, Passport, Driving License procedures
- Welfare schemes: PM-KISAN, MGNREGA, Jan Dhan Yojana, Ayushman Bharat
- Digital services: DigiLocker, e-Governance portals, online applications
- Tax procedures: GST, Income Tax, Property Tax
- Legal procedures: Filing complaints, RTI applications, court procedures

🏗️ CIVIC INFRASTRUCTURE:
- Municipal services: Water supply, sewage, waste management, road maintenance
- Public transport: Bus services, metro, auto-rickshaws, licensing
- Healthcare: PHCs, hospitals, vaccination programs, health insurance
- Education: Schools, admissions, scholarships, mid-day meals
- Public safety: Police services, fire department, disaster management

📱 JANMAT PLATFORM FEATURES:
Issue Reporting System:
- Categories: Infrastructure, Sanitation, Transportation, Safety, Environment, Utilities, Healthcare, Education
- Process: Photo upload → Description → Location → Department assignment → Status tracking
- Status types: Submitted → Under Review → In Progress → Resolved

Community Engagement:
- Polls and voting on local issues
- Following other citizens and government officials
- News feed with government announcements
- Story sharing for awareness
- Profile verification for authenticity

Government Interface:
- Officials can view, assign, and update issue status
- Post public announcements and policies
- Create polls for community feedback
- Analytics and reporting tools

Verification System:
- Citizens: Basic verification with documents
- Journalists: Media credential verification
- Officials: Government ID and department verification
- Admin approval process for all verifications

🎯 YOUR RESPONSE GUIDELINES:
1. Always encourage civic participation and democratic engagement
2. Provide specific, actionable information with step-by-step guidance
3. Reference relevant laws, schemes, or constitutional provisions when applicable
4. Suggest platform features that can help solve their problem
5. Be empathetic to citizen concerns while maintaining factual accuracy
6. Include relevant contact information or government helpline numbers
7. Promote transparency and accountability in governance

User's question: ${userMessage}

Provide a comprehensive, helpful response that combines your civic knowledge with platform guidance. If the user asks about issues outside your knowledge, direct them to appropriate government resources or suggest they report the issue on the platform for official response.`,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API error: ${response.status} - ${errorText}`);
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();
      console.log("Gemini API response:", data);

      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
      } else {
        console.error("Unexpected response format from Gemini API:", data);
        throw new Error("Unexpected response format");
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);

      // Enhanced fallback responses based on user query
      const query = userMessage.toLowerCase();
      let fallbackResponse = "";

      if (query.includes("report") || query.includes("issue")) {
        fallbackResponse =
          "To report an issue: 1) Click the '+' Report Issue button in the navbar, 2) Select the appropriate category (Infrastructure, Sanitation, Transportation, etc.), 3) Add photos and detailed description, 4) Include precise location information, 5) Submit for government review. You'll receive updates as your issue progresses through: Submitted → Under Review → In Progress → Resolved.";
      } else if (
        query.includes("poll") ||
        query.includes("vote") ||
        query.includes("voting")
      ) {
        fallbackResponse =
          "To participate in community polls: 1) Visit the 'Polls' section from the main navigation, 2) Browse currently active polls on local issues, 3) Read the poll description carefully, 4) Cast your vote by selecting your preferred option, 5) View real-time results after voting. Your voice shapes community decisions on important local matters like park renovations, traffic management, and civic improvements.";
      } else if (
        query.includes("government") ||
        query.includes("official") ||
        query.includes("authority")
      ) {
        fallbackResponse =
          "Government officials on JanMat: 1) Have verified badges (✓) for authenticity, 2) Can view, assign, and update issue statuses, 3) Post official announcements and policy updates, 4) Create community polls for public feedback, 5) Access analytics and reporting tools. Citizens can follow official accounts to stay updated on local governance activities.";
      } else if (
        query.includes("profile") ||
        query.includes("verification") ||
        query.includes("verify")
      ) {
        fallbackResponse =
          "Profile and Verification: 1) Complete your profile with accurate information, 2) Apply for verification through Profile → Verification, 3) Citizens need basic documents, 4) Journalists require media credentials, 5) Government officials need department ID verification, 6) Admin approval ensures platform authenticity. Verified users gain enhanced credibility and access to additional features.";
      } else if (query.includes("story") || query.includes("stories")) {
        fallbackResponse =
          "Story Feature: 1) Share visual updates about civic issues through 24-hour stories, 2) Add stories by clicking the '+' button in the story carousel, 3) Upload photos with captions, 4) Stories help raise awareness about local problems, 5) View community stories to stay informed about ongoing issues. Stories automatically expire after 24 hours.";
      } else if (query.includes("follow") || query.includes("community")) {
        fallbackResponse =
          "Community Engagement: 1) Follow other citizens and government officials, 2) View their issues and stories in your feed, 3) Participate in community discussions, 4) Support important issues with upvotes, 5) Build connections with neighbors and local representatives. Strong community networks lead to better civic outcomes.";
      } else if (
        query.includes("help") ||
        query.includes("how") ||
        query.includes("guide")
      ) {
        fallbackResponse =
          "JanMat Platform Guide: This is India's premier civic engagement platform. Key features: ✅ Report civic issues with photo evidence, ✅ Track issue resolution progress, ✅ Participate in community polls and voting, ✅ Follow government officials and citizens, ✅ Share awareness through stories, ✅ Receive official notifications and updates. Start by reporting an issue or exploring community polls!";
      } else {
        fallbackResponse =
          "I'm here to help with JanMat platform guidance! I can assist with: 🏛️ Reporting civic issues, 🗳️ Participating in community polls, 👥 Profile verification process, 📱 Platform navigation, 🏢 Understanding government services, 📊 Community engagement features. What specific aspect would you like help with?";
      }

      return fallbackResponse;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: input.trim(),
      role: "user",
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const aiResponse = await getAIResponse(userMessage.content);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        role: "assistant",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content:
          "I'm sorry, I encountered an error. Please try again or contact support if the problem persists.",
        role: "assistant",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              JanMat Assistant
            </h1>
            <p className="text-sm text-gray-500">
              AI helper for government services
            </p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.map((message) => (
            <div key={message.id} className="mb-6">
              <div
                className={`flex items-start space-x-4 ${
                  message.role === "user"
                    ? "flex-row-reverse space-x-reverse"
                    : ""
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === "user" ? "bg-blue-600" : "bg-green-600"
                  }`}
                >
                  {message.role === "user" ? (
                    <span className="text-white font-medium text-sm">
                      {user?.user_metadata?.full_name
                        ?.charAt(0)
                        .toUpperCase() ||
                        user?.email?.charAt(0).toUpperCase() ||
                        "U"}
                    </span>
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>

                {/* Message Content */}
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium mb-1 ${
                      message.role === "user"
                        ? "text-right text-blue-600"
                        : "text-green-600"
                    }`}
                  >
                    {message.role === "user"
                      ? user?.user_metadata?.full_name || "You"
                      : "JanMat Assistant"}
                  </div>
                  <div
                    className={`prose prose-sm max-w-none ${
                      message.role === "user"
                        ? "bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 ml-8"
                        : "bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mr-8"
                    }`}
                  >
                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed m-0">
                      {message.content}
                    </p>
                  </div>
                  <div
                    className={`text-xs text-gray-500 mt-1 ${
                      message.role === "user" ? "text-right" : "text-left"
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="mb-6">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium mb-1 text-green-600">
                    JanMat Assistant
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mr-8">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                      <span className="text-gray-600 text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Container */}
      <div className="border-t border-gray-200 bg-white px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask about government services, report issues, or get help..."
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              rows={1}
              style={{ minHeight: "48px", maxHeight: "120px" }}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
