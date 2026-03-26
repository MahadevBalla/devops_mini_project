"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  IconButton,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Close as CloseIcon, Mail } from "@mui/icons-material";
import { authService, type SignupResponse, type EmailVerificationConfirm } from "@/lib/auth";
import { ApiException } from "@/lib/api";

interface EmailVerificationModalProps {
  open: boolean;
  onClose: () => void;
  signupResponse: SignupResponse;
  onSuccess: () => void;
}

export function EmailVerificationModal({
  open,
  onClose,
  signupResponse,
  onSuccess,
}: EmailVerificationModalProps) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      setError("Please enter a 6-digit verification code");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const verificationData: EmailVerificationConfirm = {
        email: signupResponse.email,
        token: otp,
      };

      const response = await authService.verifyEmail(verificationData);
      console.log("✅ Email verification successful!", response);

      // Clear form and close modal
      setOtp("");
      setSuccessMessage("Email verified successfully! Welcome to Money Mentor!");

      // Small delay to show success message before calling onSuccess
      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.error.error || "Verification failed. Please check your code and try again.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
      console.error("❌ Email verification error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setIsResending(true);

    try {
      const response = await authService.resendVerification(signupResponse.email);
      setSuccessMessage("Verification code resent! Please check your email.");
      console.log("✅ Verification code resent:", response);

      // Clear success message after a few seconds
      setTimeout(() => setSuccessMessage(""), 3000);

    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.error.error || "Failed to resend verification code. Please try again.");
      } else {
        setError("An unexpected error occurred while resending the code.");
      }
      console.error("❌ Resend verification error:", err);
    } finally {
      setIsResending(false);
    }
  };

  const handleClose = () => {
    setOtp("");
    setError("");
    setSuccessMessage("");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, p: 1 }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Mail color="primary" />
          <Typography variant="h6" component="div">
            Verify Your Email
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pb: 2 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            We've sent a 6-digit verification code to:
          </Typography>
          <Typography variant="body1" fontWeight="medium" color="primary">
            {signupResponse.email}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Please check your email and enter the verification code below.
          </Typography>

          {/* Show dev OTP in debug mode */}
          {signupResponse.dev_otp && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Debug mode: Your verification code is <strong>{signupResponse.dev_otp}</strong>
              </Typography>
            </Alert>
          )}
        </Box>

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Verification Code"
            placeholder="Enter 6-digit code"
            value={otp}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setOtp(value);
              setError("");
            }}
            inputProps={{
              maxLength: 6,
              style: { textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.5rem' }
            }}
            disabled={isLoading}
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Button
              variant="text"
              onClick={handleResendCode}
              disabled={isResending || isLoading}
              startIcon={isResending ? <CircularProgress size={16} /> : null}
            >
              {isResending ? "Resending..." : "Didn't receive the code? Resend"}
            </Button>
          </Box>
        </form>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          variant="outlined"
          onClick={handleClose}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleVerify}
          disabled={!otp || otp.length !== 6 || isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : null}
          sx={{ minWidth: 120 }}
        >
          {isLoading ? "Verifying..." : "Verify"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}