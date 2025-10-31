"use client";

import { useCallback, useEffect, useState } from "react";
import { useDeployedContractInfo } from "../helper";
import { useWagmiEthers } from "../wagmi/useWagmiEthers";
import { FhevmInstance } from "@fhevm-sdk";
import { useFHEEncryption, useInMemoryStorage } from "@fhevm-sdk";
import type { AllowedChainIds } from "~~/utils/helper/networks";
import { useReadContract, useWriteContract, useWatchContractEvent } from "wagmi";

/**
 * useCanteenWagmi - Custom hook for Canteen orchestration
 * 
 * Provides functionality to:
 * - Add/remove members (operator nodes)
 * - Add/remove images (containers)
 * - View deployed containers and node status
 */
export const useCanteenWagmi = (parameters: {
  instance: FhevmInstance | undefined;
  initialMockChains?: Readonly<Record<number, string>>;
}) => {
  const { instance, initialMockChains } = parameters;
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();

  // Wagmi + ethers interop
  const { chainId, accounts, isConnected, ethersReadonlyProvider, ethersSigner } = useWagmiEthers(initialMockChains);

  // Resolve deployed contract info - Using old Canteen contract for testing
  const allowedChainId = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;
  const { data: canteenContract } = useDeployedContractInfo({ contractName: "Canteen", chainId: allowedChainId });

  // DEBUG: Log contract info
  useEffect(() => {
    console.log("🔍 [useCanteenWagmi] Debug Info:");
    console.log("  - chainId:", chainId);
    console.log("  - allowedChainId:", allowedChainId);
    console.log("  - canteenContract:", canteenContract);
    console.log("  - contract address:", canteenContract?.address);
  }, [chainId, allowedChainId, canteenContract]);

  // State management
  const [message, setMessage] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [members, setMembers] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Encryption hook for memory values
  const encryptionContext = useFHEEncryption({
    instance,
    chainId: allowedChainId,
  });

  // Write contract hook
  const { writeContractAsync } = useWriteContract();

  // Read members count
  const { data: membersCount, refetch: refetchMembersCount } = useReadContract({
    address: canteenContract?.address,
    abi: canteenContract?.abi,
    functionName: "getMembersCount",
    chainId: allowedChainId,
  });

  // Read images count
  const { data: imagesCount, refetch: refetchImagesCount } = useReadContract({
    address: canteenContract?.address,
    abi: canteenContract?.abi,
    functionName: "getImagesCount",
    chainId: allowedChainId,
  });

  // Fetch all members
  useEffect(() => {
    const fetchMembers = async () => {
      if (!canteenContract || !membersCount) return;
      
      const membersList: string[] = [];
      const count = Number(membersCount);
      
      for (let i = 0; i < count; i++) {
        try {
          // We'll need to add a getter function to the contract or read from events
          // For now, we'll use a placeholder
          membersList.push(`Member ${i}`);
        } catch (error) {
          console.error(`Error fetching member ${i}:`, error);
        }
      }
      
      setMembers(membersList);
    };

    fetchMembers();
  }, [canteenContract, membersCount, refreshTrigger]);

  // Fetch all images with deployment info
  useEffect(() => {
    const fetchImages = async () => {
      if (!canteenContract || !imagesCount || !ethersReadonlyProvider) return;
      
      const imagesList: any[] = [];
      const count = Number(imagesCount);
      
      const contract = new (await import("ethers")).Contract(
        canteenContract.address,
        canteenContract.abi,
        ethersReadonlyProvider
      );
      
      for (let i = 0; i < count; i++) {
        try {
          const imageName = await contract.images(i);
          // getImageDetails returns: (replicas, deployed, active)
          const imageDetails = await contract.getImageDetails(imageName);
          imagesList.push({
            name: imageName,
            replicas: Number(imageDetails[0]),
            deployed: Number(imageDetails[1]),
            active: imageDetails[2]
          });
        } catch (error) {
          console.error(`Error fetching image ${i}:`, error);
        }
      }
      
      setImages(imagesList);
    };

    fetchImages();
  }, [canteenContract, imagesCount, ethersReadonlyProvider, refreshTrigger]);

  // Watch for events
  useWatchContractEvent({
    address: canteenContract?.address,
    abi: canteenContract?.abi,
    eventName: "ImageAdded",
    onLogs: () => {
      setRefreshTrigger(prev => prev + 1);
      refetchImagesCount();
    },
  });

  useWatchContractEvent({
    address: canteenContract?.address,
    abi: canteenContract?.abi,
    eventName: "ImageRemoved",
    onLogs: () => {
      setRefreshTrigger(prev => prev + 1);
      refetchImagesCount();
    },
  });

  // Add image function
  const addImage = useCallback(
    async (imageName: string, numReplicas: number) => {
      if (!canteenContract || !writeContractAsync) {
        setMessage("Contract not available");
        return;
      }

      setIsProcessing(true);
      setMessage("Adding image...");

      try {
        const tx = await writeContractAsync({
          address: canteenContract.address,
          abi: canteenContract.abi,
          functionName: "addImage",
          args: [imageName, BigInt(numReplicas)],
        });

        setMessage(`Image added! Tx: ${tx}`);
        setRefreshTrigger(prev => prev + 1);
        refetchImagesCount();
      } catch (error: any) {
        console.error("Error adding image:", error);
        setMessage(`Error: ${error.message || "Failed to add image"}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [canteenContract, writeContractAsync, refetchImagesCount]
  );

  // Remove image function
  const removeImage = useCallback(
    async (imageName: string) => {
      if (!canteenContract || !writeContractAsync) {
        setMessage("Contract not available");
        return;
      }

      setIsProcessing(true);
      setMessage("Removing image...");

      try {
        const tx = await writeContractAsync({
          address: canteenContract.address,
          abi: canteenContract.abi,
          functionName: "removeImage",
          args: [imageName],
        });

        setMessage(`Image removed! Tx: ${tx}`);
        setRefreshTrigger(prev => prev + 1);
        refetchImagesCount();
      } catch (error: any) {
        console.error("Error removing image:", error);
        setMessage(`Error: ${error.message || "Failed to remove image"}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [canteenContract, writeContractAsync, refetchImagesCount]
  );

  return {
    // State
    message,
    isProcessing,
    isConnected,
    members,
    images,
    membersCount: membersCount ? Number(membersCount) : 0,
    imagesCount: imagesCount ? Number(imagesCount) : 0,
    contractAddress: canteenContract?.address,
    
    // Actions
    addImage,
    removeImage,
    refresh: () => setRefreshTrigger(prev => prev + 1),
  };
};
