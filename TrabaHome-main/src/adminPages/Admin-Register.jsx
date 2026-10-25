import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "../services/AdminApi.ts";

export default function AdminRegister() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const result = await adminAPI.register({ name, email, password });
      if (!result?.success) {
        setError(result?.message || "Unable to create admin account.");
      } else {
        setSuccess("Admin account created successfully. You can now sign in.");
        setTimeout(() => navigate("/admin-login"), 1200);
      }
    } catch (error) {
      setError("Unable to create admin account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F5F0] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-sm p-10">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-[#0B3B68]">Create Admin Account</h2>
          <p className="text-sm text-gray-500 mt-2">Use this only for your first admin user or team members.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-[#F4F6F8] px-4 py-3 text-sm outline-none focus:border-[#0B3B68] focus:ring-2 focus:ring-[#0B3B68]/10"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-[#F4F6F8] px-4 py-3 text-sm outline-none focus:border-[#0B3B68] focus:ring-2 focus:ring-[#0B3B68]/10"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-[#F4F6F8] px-4 py-3 text-sm outline-none focus:border-[#0B3B68] focus:ring-2 focus:ring-[#0B3B68]/10"
              placeholder="Create a password"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-[#F4F6F8] px-4 py-3 text-sm outline-none focus:border-[#0B3B68] focus:ring-2 focus:ring-[#0B3B68]/10"
              placeholder="Confirm password"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-700">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#0B3B68] py-3 text-sm font-bold text-white transition hover:bg-[#08355e] disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Create Admin Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500">
          Already have an admin account?{' '}
          <button
            type="button"
            onClick={() => navigate('/admin-login')}
            className="font-bold text-[#0B3B68] hover:underline"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
}
