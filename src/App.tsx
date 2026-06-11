/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Header from "./components/Header";
import Dashboard from "./components/Dashboard";

export default function App() {
  return (
    <div className="min-h-screen selection:bg-[#00FF66]/20 bg-[#0A0A0A]">
      <Header />
      <main>
        <Dashboard />
      </main>
    </div>
  );
}

