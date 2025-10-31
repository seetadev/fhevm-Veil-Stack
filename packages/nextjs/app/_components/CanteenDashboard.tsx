"use client";

import { useMemo, useState } from "react";
import { useFhevm } from "@fhevm-sdk";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { useCanteenWagmi } from "~~/hooks/canteen-example/useCanteenWagmi";

/**
 * CanteenDashboard - Main component for the Canteen container orchestrator
 *
 * Features:
 * - Display registered operator nodes
 * - Add/Remove Docker images with replica counts
 * - Show deployed containers across the cluster
 * - Real-time updates from blockchain events
 */
export const CanteenDashboard = () => {
  const { isConnected, chain } = useAccount();
  const chainId = chain?.id;

  // Local state for forms
  const [addImageName, setAddImageName] = useState("");
  const [addImageReplicas, setAddImageReplicas] = useState("3");
  const [removeImageName, setRemoveImageName] = useState("");

  //////////////////////////////////////////////////////////////////////////////
  // FHEVM instance
  //////////////////////////////////////////////////////////////////////////////

  const provider = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return (window as any).ethereum;
  }, []);

  const initialMockChains = { 31337: "http://localhost:8545" };

  const { instance: fhevmInstance } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  //////////////////////////////////////////////////////////////////////////////
  // Canteen contract hook
  //////////////////////////////////////////////////////////////////////////////

  const canteen = useCanteenWagmi({
    instance: fhevmInstance,
    initialMockChains,
  });

  //////////////////////////////////////////////////////////////////////////////
  // UI Styling
  //////////////////////////////////////////////////////////////////////////////

  const buttonClass =
    "inline-flex items-center justify-center px-6 py-3 font-semibold shadow-lg " +
    "transition-all duration-200 hover:scale-105 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 " +
    "disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed";

  const primaryButtonClass =
    buttonClass + " bg-[#FFD208] text-[#2D2D2D] hover:bg-[#A38025] focus-visible:ring-[#2D2D2D] cursor-pointer";

  const secondaryButtonClass =
    buttonClass + " bg-black text-[#F4F4F4] hover:bg-[#1F1F1F] focus-visible:ring-[#FFD208] cursor-pointer";

  const inputClass =
    "px-4 py-2 border-2 border-gray-300 rounded-md focus:border-[#FFD208] focus:outline-none " +
    "text-gray-900 bg-white";

  const cardClass = "bg-white shadow-xl border-2 border-gray-200 p-6 mb-6 text-gray-900";
  const titleClass = "font-bold text-gray-900 text-2xl mb-4 border-b-2 border-[#FFD208] pb-2";

  //////////////////////////////////////////////////////////////////////////////
  // Handlers
  //////////////////////////////////////////////////////////////////////////////

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addImageName || !addImageReplicas) return;

    await canteen.addImage(addImageName, parseInt(addImageReplicas, 10));
    setAddImageName("");
    setAddImageReplicas("3");
  };

  const handleRemoveImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!removeImageName) return;

    await canteen.removeImage(removeImageName);
    setRemoveImageName("");
  };

  //////////////////////////////////////////////////////////////////////////////
  // UI Rendering
  //////////////////////////////////////////////////////////////////////////////

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto p-6 text-gray-900">
        <div className="flex items-center justify-center">
          <div className="bg-white shadow-xl p-8 text-center border-2 border-gray-200">
            <div className="mb-4">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-900/30 text-amber-400 text-3xl">
                ⚠️
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Wallet Not Connected</h2>
            <p className="text-gray-600 mb-6">Please connect your wallet to interact with the Canteen orchestrator.</p>
            <RainbowKitCustomConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 text-gray-900">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">
          <span className="text-[#FFD208]">canteen.</span>
        </h1>
        <p className="text-gray-600 text-lg">A decentralized container orchestrator powered by FHE</p>
      </div>

      {/* Status Card */}
      <div className={cardClass}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">Contract Address</p>
            <p className="font-mono text-sm break-all">{canteen.contractAddress || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Operator Nodes</p>
            <p className="text-2xl font-bold text-[#FFD208]">{canteen.membersCount}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Deployed Images</p>
            <p className="text-2xl font-bold text-[#FFD208]">{canteen.imagesCount}</p>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {canteen.message && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <p className="text-blue-700">{canteen.message}</p>
        </div>
      )}

      {/* Add Image Form */}
      <div className={cardClass}>
        <h2 className={titleClass}>Deploy Container Image</h2>
        <form onSubmit={handleAddImage} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Image Name</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g., nginx, redis, mongo"
                value={addImageName}
                onChange={e => setAddImageName(e.target.value)}
                disabled={canteen.isProcessing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of Replicas</label>
              <input
                type="number"
                className={inputClass}
                placeholder="3"
                min="1"
                max="10"
                value={addImageReplicas}
                onChange={e => setAddImageReplicas(e.target.value)}
                disabled={canteen.isProcessing}
              />
            </div>
          </div>
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={canteen.isProcessing || !addImageName || !addImageReplicas}
          >
            {canteen.isProcessing ? "Processing..." : "Deploy Image"}
          </button>
        </form>
      </div>

      {/* Remove Image Form */}
      <div className={cardClass}>
        <h2 className={titleClass}>Remove Container Image</h2>
        <form onSubmit={handleRemoveImage} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Image Name</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g., nginx"
              value={removeImageName}
              onChange={e => setRemoveImageName(e.target.value)}
              disabled={canteen.isProcessing}
            />
          </div>
          <button type="submit" className={secondaryButtonClass} disabled={canteen.isProcessing || !removeImageName}>
            {canteen.isProcessing ? "Processing..." : "Remove Image"}
          </button>
        </form>
      </div>

      {/* Deployed Images List */}
      <div className={cardClass}>
        <h2 className={titleClass}>Active Deployments</h2>
        {canteen.images.length === 0 ? (
          <p className="text-gray-500 italic">No images deployed yet. Deploy your first container above!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {canteen.images.map((image: any, index) => (
              <div
                key={index}
                className="bg-gray-50 border-2 border-gray-200 p-4 rounded-md hover:border-[#FFD208] transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">🐳</span>
                  <span className="font-semibold">{image.name || image}</span>
                </div>
                {image.replicas !== undefined ? (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">
                      Replicas:{" "}
                      <span className="font-bold text-green-600">
                        {image.deployed}/{image.replicas}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{image.active ? "✅ Active" : "⚠️ Inactive"}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-2">Active deployment</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Operator Nodes Info */}
      <div className={cardClass}>
        <h2 className={titleClass}>Operator Nodes</h2>
        <p className="text-gray-600 mb-4">
          {canteen.membersCount > 0
            ? `${canteen.membersCount} operator node(s) registered and ready to deploy containers.`
            : "No operator nodes registered yet. Start Python operators to register nodes."}
        </p>
        {canteen.membersCount > 0 && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4">
            <p className="text-green-700">
              ✅ Operator nodes are running and monitoring the blockchain for deployment requests.
            </p>
          </div>
        )}
        {canteen.membersCount === 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="text-yellow-700 mb-2">⚠️ To register operator nodes, run the Python backend:</p>
            <pre className="bg-gray-900 text-green-400 p-3 rounded text-sm overflow-x-auto">
              {`python python/main.py --memory 2000 --port 5000`}
            </pre>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border-2 border-blue-200 p-6 mt-6">
        <h3 className="font-bold text-blue-900 mb-3">🚀 How It Works</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>Start Python operator nodes (they register with the smart contract)</li>
          <li>Deploy a container image using the form above</li>
          <li>The smart contract finds the best nodes using FHE-encrypted memory values</li>
          <li>Operators pull and start Docker containers automatically</li>
          <li>View active deployments in real-time on this dashboard</li>
        </ol>
      </div>
    </div>
  );
};
