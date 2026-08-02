import maleVideo from "../assets/videos/male-ai.mp4";
import femaleVideo from "../assets/videos/female-ai.mp4";
import Timer from "./Timer";
import { motion } from "framer-motion";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { ServerUrl } from "../App";
import { BsArrowRight } from "react-icons/bs";
const Step2Interview = ({ interviewData, onFinish }) => {
  // const { interviewId, questions, username } = interviewData;
  const { interviewId, questions, userName } = interviewData;
  const [isIntroPhase, setIsIntroPhase] = useState(true);

  const [isMicOn, setIsMicOn] = useState(true);
  const recognitionRef = useRef(null);
  const [isAIPlaying, setIsAIPlaying] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [timeLeft, setTimeLeft] = useState(questions[0]?.timelimit || 60);

  const [selectedVoice, setSelectedVoice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceGender, setVoiceGender] = useState("female");
  const [subtitle, setSubtitle] = useState("");

  const videoref = useRef(null);
  const currentQuestion = questions[currentIndex];
  const isRecognizingRef = useRef(false);

  const [answeredQuestions, setAnsweredQuestions] = useState([]);

  const stopMic = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsMicOn(false);
  };

  const startMic = () => {
    if (recognitionRef.current && !isAIPlaying && !isRecognizingRef.current) {
      try {
        recognitionRef.current.start();
        setIsMicOn(true);
      } catch (error) {
        console.log("Error starting mic:", error);
      }
    }
  };

  const toggleMic = () => {
    if (isMicOn) {
      stopMic();
      setIsMicOn(false);
    } else {
      startMic(!isMicOn);
      setIsMicOn(true);
    }
  };

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;

      //try known female voices first
      const femaleVoice = voices.find(
        (v) =>
          v.name.toLowerCase().includes("zira") ||
          v.name.toLowerCase().includes("samantha") ||
          v.name.toLowerCase().includes("female"),
      );
      if (femaleVoice) {
        setSelectedVoice(femaleVoice);
        setVoiceGender("female");
        console.log("Selected voice:", femaleVoice.name, "Gender: female");
        return;
      }
      //try known male voices
      const maleVoice = voices.find(
        (v) =>
          v.name.toLowerCase().includes("david") ||
          v.name.toLowerCase().includes("mark") ||
          v.name.toLowerCase().includes("male"),
      );
      if (maleVoice) {
        setSelectedVoice(maleVoice);
        setVoiceGender("male");
        console.log("Selected voice:", maleVoice.name, "Gender: male");
        return;
      }
      //fallback: first voice (assume female)
      const fallback = voices[0];
      setSelectedVoice(fallback);
      setVoiceGender(
        fallback.name.toLowerCase().includes("female") ? "female" : "male",
      );
      console.log("Selected voice:", fallback.name, "Gender:", voiceGender);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    console.log("Selected voice:", selectedVoice?.name, "Gender:", voiceGender);
  }, []);

  const videoSource = voiceGender === "male" ? maleVideo : femaleVideo;

  // speak function
  const speakText = (text) => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis || !selectedVoice) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();

      // add natural pauses after commas and periods
      const humanText = text.replace(/,/g, ", ... ").replace(/\./g, ". ...");

      const utterance = new SpeechSynthesisUtterance(humanText);
      utterance.voice = selectedVoice;

      //human like pacing
      utterance.rate = 0.92;
      utterance.pitch = 1.05;
      utterance.volume = 1;

      utterance.onstart = () => {
        setIsAIPlaying(true);
        stopMic();
        videoref.current?.play();
      };
      utterance.onend = () => {
        videoref.current?.pause();
        videoref.current.currentTime = 0;
        setIsAIPlaying(false);

        // if (isMicOn && !isRecognizingRef.current) {
        //   startMic();
        // }

        setTimeout(() => {
          setSubtitle(""); // clear subtitle after AI finishes
          resolve();
        }, 300);

        setSubtitle(text); // show AI words separately
      };
      window.speechSynthesis.speak(utterance);
    });
  };

  useEffect(() => {
    if (!selectedVoice) {
      return;
    }
    const runIntro = async () => {
      if (isIntroPhase) {
        await speakText(
          `Hi ${userName}, it's great to meet you today. I hope you're feeling confident and ready.`,
        );

        await speakText(
          "I'll ask you a few questions. Just answer naturally, and take your time. Let's begin.",
        );
        setIsIntroPhase(false);
      } else if (currentQuestion) {
        await new Promise((r) => setTimeout(r, 800));

        // If last question (hard level)
        if (currentIndex === questions.length - 1) {
          await speakText("Alright, this one might be a bit more challenging.");
        }

        await speakText(currentQuestion.question);
        if (isMicOn) {
          startMic();
        }
      }
    };
    runIntro();
  }, [selectedVoice, isIntroPhase, currentIndex]);

  const submitAnswer = async () => {
    if (isSubmitting) return;
    stopMic();
    setIsSubmitting(true);

    setTimeLeft(0);
    try {
      const result = await axios.post(
        ServerUrl + "/api/interview/submit-answer",
        {
          interviewId,
          questionIndex: currentIndex,
          answer,
          timeTaken: currentQuestion.timelimit - timeLeft,
        },
        { withCredentials: true },
      );

      setAnsweredQuestions((prev) => [
        ...prev,
        {
          question: currentQuestion.question,
          difficulty: currentQuestion.difficulty,
          timelimit: currentQuestion.timelimit,
          answer,
          feedback: result.data.feedback,
          score: result.data.score || 0,
          confidence: result.data.confidence || 0,
          communication: result.data.communication || 0,
          correctness: result.data.correctness || 0,
        },
      ]);

      setFeedback(result.data.feedback);
      console.log("---- Question", currentIndex + 1, "Result ----");
      speakText(result.data.feedback);
      setIsSubmitting(false);
    } catch (error) {
      console.log(error);
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    setAnswer("");
    setFeedback("");

    // If currentIndex is 4 (5th question, since index starts at 0)
    if (currentIndex === 4) {
      console.log("✅ 5th question completed, redirecting to Step3...");
      console.log("Sending questions to finish:", answeredQuestions);
      finishInterview(); // This will trigger Step3
      return;
    }

    if (currentIndex + 1 >= questions.length) {
      finishInterview();
      return;
    }

    await speakText("Alright, let's move to the next question.");

    setCurrentIndex(currentIndex + 1);
    if (isMicOn) startMic();
  };

  useEffect(() => {
    if (isIntroPhase) return;
    if (!currentQuestion) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isIntroPhase, currentIndex]);

  useEffect(() => {
    if (!isIntroPhase && currentQuestion) {
      setTimeLeft(currentQuestion.timelimit || 60);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (!("webkitSpeechRecognition" in window)) {
      console.error("SpeechRecognition not supported in this browser");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true; // important for live updates

    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        }
      }
      if (finalTranscript) {
        setAnswer((prev) => (prev + " " + finalTranscript).trim());
      }
    };

    recognition.onstart = () => {
      isRecognizingRef.current = true;
      console.log("Mic started");
    };

    recognition.onend = () => {
      isRecognizingRef.current = false;
      console.log("Recognition stopped");
      // Only restart if mic is ON
      if (isMicOn && !isAIPlaying) {
        setTimeout(() => {
          if (!isRecognizingRef.current && isMicOn) {
            recognition.start();
          }
        }, 300);
      }
    };

    recognition.onerror = (e) => {
      console.error("Speech recognition error:", e);
    };

    recognitionRef.current = recognition;
  }, []);

  const finishInterview = async () => {
    stopMic();
    setIsMicOn(false);
    try {
      const result = await axios.post(
        ServerUrl + "/api/interview/finish",
        {
          interviewId,
          questions: answeredQuestions,
        },
        { withCredentials: true },
      );

      console.log("==== Final Interview Summary ====");
      console.log("Final Score:", result.data.finalScore);
      console.log("Confidence:", result.data.confidence);
      console.log("Communication:", result.data.communication);
      console.log("Correctness:", result.data.correctness);
      console.log("Question-wise Score:", result.data.questionWiseScore);
      console.log("=================================");

      console.log(result.data);
      onFinish(result.data);
    } catch (error) {
      console.error("Finish error details:", error.response?.data);
    }
  };

  useEffect(() => {
    if (isIntroPhase) return;
    if (!currentQuestion) return;

    if (timeLeft === 0 && !isSubmitting && !feedback) {
      submitAnswer();
    }
  }, [timeLeft]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current.abort();
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-350 min-h-[80vh] bg-white rounded-3xl shadow-2xl border border-gray-200 flex flex-col lg:flex-row overflow-hidden">
        {/* video section */}
        <div className="w-full lg:w-[35%] bg-white flex flex-col items-center p-6 space-y-6 border-r border-gray-200">
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-xl">
            <video
              src={videoSource}
              key={videoSource}
              ref={videoref}
              className="w-full h-auto object-cover"
              preload="auto"
              muted
              playsInline
            />
          </div>

          {/* subtitle pending */}
          {subtitle && (
            <div className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-gray-700 text-sm sm:text-base font-medium text-center leading-relaxed">
                {subtitle}
              </p>
            </div>
          )}

          {/* timer area  */}
          <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-md p-6 space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Interview Status</span>
              {isAIPlaying && (
                <span className="text-sm font-semibold text-emerald-600">
                  {isAIPlaying ? "AI Speaking" : ""}
                </span>
              )}
            </div>
            <div className="h-px bg-gray-200"></div>
            <div className="flex justify-center">
              <Timer
                timeLeft={timeLeft}
                totalTime={currentQuestion?.timelimit || 60}
              />
            </div>
            <div className="h-px bg-gray-200"></div>
            <div className="grid grid-cols-2 gap-6 text-center">
              <div>
                <span className="text-2xl font-bold text-emerald-600">
                  {currentIndex + 1}
                </span>
                <span className="text-xs text-gray-400">Current Questions</span>
              </div>

              <div>
                <span className="text-2xl font-bold text-emerald-600">
                  {questions.length}
                </span>
                <span className="text-xs text-gray-400">Total Questions</span>
              </div>
            </div>
          </div>
        </div>

        {/* text section */}
        <div className="flex-1 flex flex-col p-4 sm:p-8 md:p-8 relative">
          <h2 className="text-xl sm:text-2xl font-bold text-emerald-600 mb-6">
            AI Smart Interview
          </h2>
          {!isIntroPhase && (
            <div className="relative mb-6 bg-gray-50 p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-xs sm:text-sm text-gray-400 mb-2">
                Question {currentIndex + 1} of {questions.length}
              </p>
              <div className="text-base sm:text-lg font-semibold text-gray-800 leading-relaxed pr-16">
                {currentQuestion?.question}
              </div>
            </div>
          )}
          <textarea
            placeholder="Type your answer here..."
            onChange={(e) => setAnswer(e.target.value)}
            value={answer}
            className="flex-1 bg-gray-100 p-4 sm:p-6 rounded-2xl resize-none outline-none border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition text-gray-800"
          />
          {!feedback ? (
            <div className="flex items-center gap-4 mt-6">
              <motion.button
                onClick={toggleMic}
                whileTap={{ scale: 0.9 }}
                className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-black text-white shadow-lg"
              >
                {isMicOn ? (
                  <FaMicrophone size={20} />
                ) : (
                  <FaMicrophoneSlash size={20} />
                )}
              </motion.button>
              <motion.button
                onClick={submitAnswer}
                disabled={isSubmitting}
                whileTap={{ scale: 0.95 }}
                className="flex-1 bg-gradient-to-r from bg-emerald-600 to-teal-500 text-white py-3 sm:py-4 rounded-2xl shadow-lg hover:opacity-90 transition font-semibold disabled:bg-gray-500"
              >
                {isSubmitting ? "Submitting..." : "Submit Answer"}
              </motion.button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 bg-emerald-50 border border-emerald-200 p-5 rounded-2xl shadow-sm"
            >
              <p className="text-emerald-700 font-medium mb-4">{feedback}</p>
              <button
                onClick={handleNext}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white py-3 rounded-xl shadow-md hover:opacity-90 transition flex items-center justify-center gap-1"
              >
                Next Question <BsArrowRight size={18} />
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Step2Interview;
