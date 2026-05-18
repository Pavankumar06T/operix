import { useState } from "react";

export default function Dashboard() {
  const [progress, setProgress] = useState(60); // Example: 60% complete
  const [feedback, setFeedback] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Feedback submitted: " + feedback);
    setFeedback("");
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Client Dashboard</h2>

      {/* Progress Bar */}
      <div className="mb-6">
        <p>Project Progress: {progress}%</p>
        <div className="w-full bg-gray-300 rounded h-4">
          <div
            className="bg-green-500 h-4 rounded"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Milestones */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Milestones</h3>
        <ul className="list-disc pl-6">
          <li>Requirement Gathering ✅</li>
          <li>Design Phase ✅</li>
          <li>Development (In Progress)</li>
          <li>Testing (Pending)</li>
        </ul>
      </div>

      {/* Feedback Form */}
      <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow-md">
        <h3 className="text-lg font-semibold mb-2">Submit Feedback</h3>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="w-full p-2 border rounded mb-3"
          placeholder="Enter your feedback..."
        ></textarea>
        <button className="bg-blue-500 text-white px-4 py-2 rounded">
          Submit
        </button>
      </form>
    </div>
  );
}
