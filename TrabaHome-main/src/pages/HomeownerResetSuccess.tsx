import { Link } from "react-router-dom";

export default function HomeownerResetSuccess() {
  return (
    <div className="min-h-screen bg-[#F9F5F0] flex items-center justify-center p-6">
      <div className="w-full max-w-[400px] bg-white rounded-[40px] shadow-sm p-10 flex flex-col items-center">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-100 text-green-600 mb-4">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M20 6L9 17L4 12"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2 className="text-[#0B3B68] text-2xl font-bold text-center">Password Successfully Reset!</h2>
        <p className="text-[#0B3B68] text-[10px] text-center mt-2 opacity-80">
          You can now sign in with your new password.
        </p>

        <Link
          to="/login"
          className="w-full text-center block bg-[#0B3B68] text-white font-bold py-3 rounded-xl mt-6 hover:bg-[#082d50] transition-colors"
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
}
