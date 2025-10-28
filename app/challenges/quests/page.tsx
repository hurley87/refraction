"use client";

import React, { useState, useEffect } from "react";
import {  X, Info, ExternalLink } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface Quest {
  title: string;
  description: string;
  points: number;
  url: string;
  image?: string;
  "image-width"?: string;
  "image-height"?: string;
  id?: string;
  progress?: number;
  maxProgress?: number;
  isCompleted?: boolean;
}

interface QuestModalProps {
  quest: Quest;
  isOpen: boolean;
  onClose: () => void;
}

const QuestModal: React.FC<QuestModalProps> = ({ quest, isOpen }) => {
  if (!isOpen) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* First Container - Quest Header */}
      <div className="p-6">
        {/* Row 1: Quest Type */}
        <div className="mb-4">
          <span className="body-small text-gray-600 uppercase tracking-wide">
            Challenge Quest
          </span>
        </div>

        {/* Row 2: Quest Image */}
        {quest.image && (
          <div 
            className="mb-4"
            style={{
              display: 'flex',
              width: '100%',
              height: '80px',
              padding: '24px',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '16px',
              borderRadius: '16px',
              background: 'radial-gradient(220.55% 55.23% at 10.91% 29.08%, rgba(0, 0, 0, 0.00) 0%, rgba(239, 139, 159, 0.20) 100%), radial-gradient(81.69% 149.02% at 30% -26.79%, rgba(0, 0, 0, 0.00) 28.61%, rgba(3, 133, 255, 0.54) 100%), #313131'
            }}
          >
            <Image
              src={quest.image}
              alt={quest.title}
              width={parseInt(quest["image-width"] || "200")}
              height={parseInt(quest["image-height"] || "200")}
              className="h-full w-auto object-contain"
            />
          </div>
        )}

        {/* Row 3: Quest Title */}
        <div>
          <div className="title2 text-black">{quest.title}</div>
        </div>
      </div>

      {/* Second Container - Quest Details */}
      <div className="p-6">
        {/* Row 1: Details Header */}
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-gray-600" />
          <span className="body-small text-gray-600 uppercase tracking-wide">Details</span>
        </div>

        {/* Row 2: Description */}
        <div className="mb-6">
          <p className="text-gray-600 font-mono">{quest.description}</p>
        </div>

        {/* Row 3: Points and Action Button */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Points */}
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                height: '32px',
                backgroundColor: 'transparent',
                borderRadius: '16px',
                padding: '6px 12px',
                border: '1px solid #e0e0e0'
              }}
            >
              <Image
                src="/ep_coin.svg"
                alt="coin"
                width={16}
                height={16}
                className="w-4 h-4"
              />
              <div className="body-small text-black">{quest.points}</div>
            </div>

            {/* Action Button */}
            <div 
              style={{
                display: 'flex',
                alignItems: 'left',
                justifyContent: 'left',
                gap: '8px',
                width: '100%',
                height: '32px',
                backgroundColor: 'transparent',
                borderRadius: '16px',
                padding: '6px 12px',
                border: '1px solid #e0e0e0',
                cursor: 'pointer'
              }}
            >
              <Image
                src="/guidance_library.svg"
                alt="library"
                width={16}
                height={16}
                className="w-4 h-4"
              />
              <div className="body-small text-black">Buy</div>
            </div>
          </div>
        </div>

        {/* Row 4: Complete Quest Button */}
        <button
          className="w-full bg-black hover:bg-gray-800 text-white py-3 px-4 rounded-full font-inktrap font-medium transition-colors duration-200 flex items-center justify-between"
        >
          Complete Quest on Galaxe
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default function QuestsPage() {
  const router = useRouter();
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [questHeader, setQuestHeader] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load quests data
  useEffect(() => {
    const loadQuests = async () => {
      try {
        setIsLoading(true);
        
        // Load quest header (banner) data
        const headerResponse = await fetch('/data/challenges/quests.json');
        if (headerResponse.ok) {
          const headerData = await headerResponse.json();
          setQuestHeader(headerData[0]); // Get first item from array
        }
        
        // Load individual quest items
        const response = await fetch('/data/challenges/quest-items.json');
        if (response.ok) {
          const questsData = await response.json();
          const enrichedQuests = questsData.map((quest: any, index: number) => ({
            ...quest,
            id: `quest-${index + 1}`,
            progress: Math.floor(Math.random() * 5) + 1,
            maxProgress: 10,
            isCompleted: Math.random() > 0.7
          }));
          setQuests(enrichedQuests);
        } else {
          console.error('Failed to load quests:', response.status);
        }
      } catch (error) {
        console.error('Error loading quests:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadQuests();
  }, []);

  const handleQuestClick = (quest: Quest) => {
    setSelectedQuest(quest);
    setIsModalOpen(true);
  };

  const renderQuestCard = (quest: Quest) => {
    return (
      <div
        key={quest.id}
        className="rounded-2xl flex flex-col gap-4 transition-all duration-200"
      >
        {/* Row 1: Title and Description */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="title2 text-[#313131]">
              {quest.title}
            </div>
          </div>
          <div className="text-[#4F4F4F] body-medium">
            {quest.description}
          </div>
        </div>

        {/* Row 2: Points, Buy Button, and View Button */}
        <div className="flex gap-4">
          {/* Points */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: '32px',
              backgroundColor: 'transparent',
              borderRadius: '16px',
              padding: '6px 12px',
              border: '1px solid #e0e0e0',
              flexShrink: 0
            }}
          >
            <Image
              src="/ep_coin.svg"
              alt="coin"
              width={16}
              height={16}
              className="w-4 h-4"
            />
            <div className="body-small text-black">{quest.points}</div>
          </div>

          {/* Buy Button */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: '8px',
              flex: 1,
              height: '32px',
              backgroundColor: 'transparent',
              borderRadius: '16px',
              padding: '6px 12px',
              border: '1px solid #e0e0e0',
              cursor: 'pointer'
            }}
          >
            <Image
              src="/guidance_library.svg"
              alt="library"
              width={16}
              height={16}
              className="w-4 h-4"
            />
            <div className="body-small text-black">Buy</div>
          </div>

          {/* View Button */}
          <button
            onClick={() => handleQuestClick(quest)}
            className="flex-1 bg-[#EDEDED] hover:bg-gray-100 text-black text-xs font-mono px-3 py-1.5 rounded-full transition-colors duration-200 flex items-center justify-between border border-gray-200"
          >
            <span>View</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        background:
          "linear-gradient(0deg, #61BFD1 0%, #EE91B7 26.92%, #FFE600 54.33%, #1BA351 100%)",
      }}
      className="min-h-screen p-4 pb-0 font-grotesk"
    >
      <div className="max-w-lg mx-auto">
        {/* Back Button */}
        <div className="pt-4">
          <button
            onClick={() => router.push('/challenges')}
            style={{
              display: 'flex',
              width: '100%',
              height: '56px',
              padding: '16px',
              alignItems: 'center',
              gap: '16px',
              borderRadius: '24px',
              background: '#FFF'
            }}
            className="text-black hover:opacity-80 transition-opacity"
          >
            <Image
              src="/arrow-left.svg"
              alt="back"
              width={20}
              height={20}
              className="w-5 h-5"
            />
            <h4>Quest</h4>
          </button>
        </div>

        {/* Main Content */}
        <div className="px-0 pt-1 space-y-1">
          {/* Loading State */}
          {isLoading && (
            <div className="bg-white rounded-2xl p-8 text-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 font-inktrap">Loading quests...</p>
            </div>
          )}

          {/* Quest Header/Banner Card */}
          {!isLoading && questHeader && (
            <div className="bg-white backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="rounded-2xl flex flex-col gap-3 transition-all duration-200">
                {/* Quest Challenge Image - Full Width Above Title */}
                {questHeader.image && (
                  <div className="w-full">
                    <Image
                      src={questHeader.image}
                      alt={questHeader.title}
                      width={parseInt(questHeader["image-width"] || "300")}
                      height={parseInt(questHeader["image-height"] || "200")}
                      className="w-full h-auto object-contain rounded-xl"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2 mb-4">
                  <span className="body-small text-gray-600 uppercase tracking-wide">
                    Challenge Quest
                  </span>
                </div>
                {/* Title and Description */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="title2 text-black">
                      {questHeader.title}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 font-mono line-clamp-1">
                    {questHeader.description}
                  </p>
                </div>
                {/* Complete Quest Button */}
                <button
                  className="w-full bg-black hover:bg-gray-800 text-white py-3 px-4 rounded-full font-inktrap font-medium transition-colors duration-200 flex items-center justify-between"
                >
                  <h4>Complete Quest on Galaxe</h4>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Quests Section */}
          {!isLoading && (
            <>
             
              <div className="space-y-1">
                {quests.map(quest => (
                  <div key={quest.id} className="bg-white backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                    {renderQuestCard(quest)}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quest Modal */}
      {isModalOpen && selectedQuest && (
        <div
          className={`fixed font-inktrap inset-0 bg-[#ededed] z-50 flex flex-col transition-all duration-300 ease-in-out ${
            isModalOpen ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="max-w-lg mx-auto w-full flex flex-col h-full">
            {/* Close Button - Full Width Overlay */}
            <div className="w-full px-4 pt-4 pb-1">
              <div className="bg-white rounded-3xl">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedQuest(null);
                  }}
                  className="w-full text-black h-10 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center"
                  aria-label="Close menu"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="w-full px-4 pb-4">
              <div className="bg-white rounded-3xl">
                <QuestModal 
                  quest={selectedQuest} 
                  isOpen={isModalOpen} 
                  onClose={() => {
                    setIsModalOpen(false);
                    setSelectedQuest(null);
                  }} 
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

