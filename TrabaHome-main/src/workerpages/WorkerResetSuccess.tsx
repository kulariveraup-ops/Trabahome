import { Link } from "react-router-dom";

export default function WorkerResetSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFD700]/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M20 6L9 17L4 12"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-[#0B3B68]">Password Successfully Reset!</h1>
          </div>

          <Link
            to="/worker-login"
            className="w-full text-center block bg-gradient-to-r from-[#FFD700] to-[#FFC107] text-[#0B3B68] font-bold py-3 rounded-lg hover:shadow-lg transition-all"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
